import re
import logging 
import requests
from yair import run_test

from threading import Thread, Lock
from Queue import Queue

from flask import render_template
from app import app, db
from app.models import Image, Tag, Layer, TagLayer
from math import ceil
from sqlalchemy import and_
from datetime import datetime
from pytz import UTC
import argparse
import random
import json

from sqlalchemy import or_

LOG_LEVEL=logging.WARNING
clair_server=["159.89.81.113:6060", \
              "159.65.239.206:6060", \
              "167.99.170.175:6060", \
              "167.99.169.42:6060", \
              "167.99.166.236:6060", \
              "167.99.169.37:6060", \
              "167.99.169.47:6060"]


headers = {'Host': 'store.docker.com', \
    'DNT': '1',\
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',\
    'Connection': 'keep-alive'}


def clean_sha(digest):
    return digest.replace('sha256:','')


def check_tags(image_full_name, tag_name):
    url = "%s%s%s%s" %('https://store.docker.com/v2/repositories/', image_full_name, '/tags/', tag_name )
    r = requests.get(url, headers=headers)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        logging.error('Tag issue: %s %s', image_full_name+":"+tag_name,e)
    if r.status_code == 404 or r.status_code == 403:
        return False
    return True



def do_check_image(tup):
    tag = tup[0]
    image = tup[1]
    tag_id = tag.id
    tag_full_name = image.full_name +  ":" + tag.name
    if check_tags(image.full_name, tag.name):
        Tag.query.get(tag_id).status = True
        db.session.commit()
    else:
        Tag.query.get(tag_id).status = False
        db.session.commit()
        logging.error("404")
        
    server = random.choice(clair_server)
    logging.error("Analyse %s - server %s", tag_full_name, server)
    done=False
    try:
        image_digest, layers, manifest_v2, manifest_v1 = run_test(tag_full_name, server, LOG_LEVEL)
        done=True
    except Exception as err:
        logging.error("Pass %s %s %s", tag_id, tag_full_name, err)
        pass

    if done:
        logging.info("Numbers of layers %s", len(layers))
        for layer_name in layers:
            layer_name_cleaned = layer_name.replace('sha256:','')
            digest_global_cleaned = image_digest.replace('sha256:','')
            layer_name_with_digest = "%s%s" %(digest_global_cleaned, layer_name_cleaned)

            try:
                #find first layer with digest
                layer = Layer.query.filter(Layer.name==layer_name_with_digest).one_or_none()

                if not layer:
                    layer = Layer.query.filter(Layer.name==layer_name_cleaned).one_or_none()
                elif not layer:
                    layer = Layer.query.filter(Layer.name==layer_name).one_or_none()
            except:
                logging.error("Multiple rows %s ", tag_full_name)

            if not layer:
                logging.warning("Database does not have the item %s :/", layer_name)
            else:
                logging.info("Save manifest - layer_id: %s", layer.id)
                layer.manifest = manifest_v2
                layer.manifest_v1 = manifest_v1
                db.session.commit()
                tl = TagLayer(tag_id=tag_id,layer_id=layer.id)
                db.session.add(tl)
                db.session.commit()
                logging.info("Saved - TagLayer with layer %s taglayer %s ", layer.id, tl.id)
                
                Tag.query.get(tag_id).last_check = datetime.utcnow().replace(tzinfo=UTC)
                print "Done %s %s" %(tag_id, tag_full_name)
                db.session.commit()        

    Tag.query.get(tag_id).last_try = datetime.utcnow().replace(tzinfo=UTC)
    db.session.commit()        

def check_image(q):
    while True:
        tup = q.get()
        do_check_image(tup)
        q.task_done()


parser = argparse.ArgumentParser(description='Process some integers.')
parser.add_argument('-t', action="store", dest="threads", default=1)
parser.add_argument('--name', action="store", dest="name")
parser.add_argument('--log', action="store", dest="log")


results = parser.parse_args()



logging.getLogger('requests').setLevel(logging.WARNING)

logging.basicConfig(level=LOG_LEVEL,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s',)


num_fetch_threads = int(results.threads)
pattern_queue = Queue()
lock = Lock()




if results.name:
    image_name = results.name.split(":")[0]
    tag_name = results.name.split(":")[1]
    print image_name
    print tag_name
    tag = Tag.query.join(Image, Image.id == Tag.image_id)\
        .filter(and_(Image.full_name==image_name, Tag.name==tag_name))\
        .one_or_none()
    if tag:
        tup1 = (tag, image)
        do_check_image(tup)

else:
    # Set up some threads to fetch the enclosures
    for i in range(num_fetch_threads):
        worker = Thread(target=check_image, args=(pattern_queue,))
        worker.setDaemon(True)
        worker.start()

    MIN_PULL_COUNT=35*1000000



    #query = Tag.query.join(Image, Image.id == Tag.image_id)\
    query = Tag.query.join(Image, Image.id == Tag.image_id)\
                .filter(Image.namespace=="library")\
                .filter(Tag.last_check.is_(None))

    i=0;

    tags = query.order_by(Image.pull_count.desc()).limit(400000).all()

    for tag in tags:
        i=i+1
        tup1 = (tag, tag.image, str(i))
        pattern_queue.put(tup1)


    pattern_queue.join()       

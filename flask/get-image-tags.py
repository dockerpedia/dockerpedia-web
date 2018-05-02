import requests
import logging
import MySQLdb
from math import ceil
from sqlalchemy import or_

from flask import render_template
from app import app, db
from app.models import Image, Tag, Layer

from threading import Thread, Lock
from Queue import Queue

from datetime import datetime, timedelta
from pytz import UTC

from time import sleep
import argparse

headers = {'Host': 'store.docker.com', \
    'DNT': '1',\
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',\
    'Connection': 'keep-alive'}

host="localhost"
database="dockerpedia"
user='docker'
password="tj0EnSgeFjjqG7Cug6b7"
unix_socket="/var/lib/mysql/mysql.sock"


logging.getLogger('requests').setLevel(logging.WARNING)


def get_pages_tags(full_name):
    url = "%s%s%s" %('https://store.docker.com/v2/repositories/', full_name, '/tags/?page_size=100&page=1')

    r = requests.get(url, headers=headers)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Whoops it wasn't a 200
        logging.error('Unable to get dockerfile: %s %s', full_name,e)
    try:
        pages = int(ceil(int(r.json()["count"])/100.0))
        return pages
    except Exception as e:
        logging.error('Unable to get page count %s %s', full_name, e)

def get_tags_page(full_name, page):
    url = "%s%s%s%s" %('https://store.docker.com/v2/repositories/', full_name, '/tags/?page_size=100&page=', page)

    r = requests.get(url, headers=headers)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Whoops it wasn't a 200
        logging.error('Unable to get dockerfile: %s %s', full_name,e)
    try:
        return r.json()["results"]
    except Exception as e:
        logging.error('Unable to get page count %s %s', full_name, e)


def get_tags(full_name, image_id):
    pages = get_pages_tags(full_name)
    image = Image.query.get(image_id)
    if pages > 0 and image:
        for page in xrange(1,pages+1):
            tags = get_tags_page(full_name, page)
            if tags != None:
                for tag in tags:
                    tag_db = Tag.query.filter_by(image_id=image_id,name=tag["name"]).first()
                    if not tag_db:
                        t = Tag(name=tag["name"], \
                                last_updated=tag["last_updated"], \
                                full_size= tag["full_size"], \
                                id_docker=tag["id"], \
                                image_id=image_id)
                        logging.info("Saving - image_id %s - %s", image_id, t.name)
                        db.session.add(t)
                        db.session.commit()
        image.tags_checked = datetime.utcnow().replace(tzinfo=UTC)
        db.session.commit()
        logging.info("Get tags finished: %s", image_id)



def thread_get_tag(q):
    while True:
        tup = q.get()
        full_name = tup[0]
        image_id = tup[1]
        logging.info("Get tags: %s", full_name)
        get_tags(full_name, image_id)
        q.task_done()


logging.basicConfig(level=logging.INFO,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s) %(message)s',)

parser = argparse.ArgumentParser(description='Process some integers.')
parser.add_argument('-t', action="store", dest="threads", default=1)
results = parser.parse_args()
num_fetch_threads = int(results.threads)

pattern_queue = Queue()
lock = Lock()

# Set up some threads to fetch the enclosures
for i in range(num_fetch_threads):
    worker = Thread(target=thread_get_tag, args=(pattern_queue,))
    worker.setDaemon(True)
    worker.start()



WINDOW_SIZE = 10000.0
start = 0
window_idx = 0

current_time = datetime.utcnow().replace(tzinfo=UTC)
query_image_filter = Image.query.filter(Image.tags_checked.is_(None))

number_items = query_image_filter.count()
print number_items

max_window = ceil(number_items/WINDOW_SIZE)

while window_idx <  max_window:
    stop = start + WINDOW_SIZE

    images = query_image_filter.order_by(Image.pull_count.desc())\
            .slice(start, stop).all()

    for image in images:
        image_name = image.full_name
        image_id = image.id

        tup1 = (image_name, image_id)
        pattern_queue.put(tup1)
        break


    window_idx += 1

pattern_queue.join()
import requests
import sys
import argparse
import logging
from math import ceil
from app import app, db
from app.models import Image, Tag, Layer

headers = {'Host': 'store.docker.com', \
    'DNT': '1',\
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',\
    'Connection': 'keep-alive'}



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
    if pages > 0:
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
                        db.session.add(t)
                        db.session.commit()


'''
Get the full_name of all images in a page by pattern
'''
def images_per_page_pattern(page):
    url = "%s%s%s" \
        %('https://store.docker.com/api/content/v1/products/search/?type=image,bundle&page=',\
        page, \
        '&page_size=10')

    r = requests.get(url, headers=headers)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Whoops it wasn't a 200
        logging.error('Unable to query the images, page: %s %s', page,e)
    try:
        return r.json()["summaries"]
    except Exception as e:
        logging.error('Unable to query the images, page: %s %s', page,e)

'''
This function gets a complete data of a Docker images, also the main Dockerfile
'''
def get_data(full_name):
    logging.debug('Get the job %s', full_name)
    url = "%s%s" %('https://store.docker.com/api/content/v1/products/images/', full_name)

    #url = "%s%s%s" %('https://store.docker.com/v2/repositories/', full_name, '/')
    r = requests.get(url, headers=headers)

    try:
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        logging.error('Unable request info: %s  %s', full_name, e)



logging.basicConfig(level=logging.WARNING,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s ) %(message)s',)



def get_data_library(full_name):
    logging.debug('Get the job %s', full_name)

    url = "%s%s%s" %('https://store.docker.com/v2/repositories/library/', full_name, '/')
    r = requests.get(url, headers=headers)

    try:
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        logging.error('Unable request info: %s  %s', full_name, e)

    return None

def get_data_community(full_name):
    logging.debug('Get the job %s', full_name)

    url = "%s%s%s" %('https://store.docker.com/v2/repositories/', full_name, '/')
    r = requests.get(url, headers=headers)

    try:
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        logging.error('Unable request info: %s  %s', full_name, e)

    return None

def save_image(image_info):
    name = image_info["name"]
    user = image_info["user"]
    namespace = image_info["namespace"]
    repository_type = image_info["repository_type"]
    status = image_info["status"]
    try:
        description = image_info["description"].decode('latin1').encode('utf-8')
    except:
        description = ''
        pass
    is_automated = image_info["is_automated"]
    star_count = image_info["star_count"]
    pull_count = image_info["pull_count"]
    last_updated = image_info["last_updated"]
    affiliation = image_info["affiliation"]
    full_name = "%s/%s" %(namespace, name)
    status = bool(status)
    is_automated = int(is_automated)

    image_db = Image.query.filter_by(full_name = full_name).first()
    if image_db:
        image_id = image_db.id
        logging.info("Ignore %s ", full_name )

    else:
        try:
            logging.info("Insert %s ", full_name )

            i = Image(name=name, user=user, namespace=namespace, repository_type=repository_type, \
                status=status, description=description, is_automated=is_automated, star_count=star_count, \
                pull_count=pull_count, last_updated=last_updated, affiliation=affiliation, \
                full_name=full_name)
            db.session.add(i)
            db.session.commit()        
            image_id = i.id
        except Exception, e:
            logging.error("guardando item %s", e )
            raise
    logging.info("Get tags: %s", image_id)
    get_tags(full_name, image_id)


    i = Image(name=name, user=user, namespace=namespace, repository_type=repository_type, \
        status=status, description=description, is_automated=is_automated, star_count=star_count, \
        pull_count=pull_count, last_updated=last_updated, affiliation=affiliation, \
        full_name=full_name)

    db.session.add(i)
    db.session.commit()        
    image_id = i.id

    get_tags(full_name, image_id)


pages=22
if pages > 0:
    for page in xrange(1,pages+1):
        print "page " +  str(page)
        logging.debug("Querying the page: %s", page)
        images = images_per_page_pattern(page)

        for image in images:
            image_store = get_data(image["slug"])
            print image_store["source"]
            if image_store["source"] == "library":
                image_info = get_data_library(image_store["name"])
                save_image(image_info)

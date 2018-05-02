import requests
import sys
import argparse
from itertools import product, islice
from string import digits, ascii_lowercase
import logging
from threading import Thread, Lock
from Queue import Queue
from math import ceil

from image import *
from tag import *

headers = {'Host': 'store.docker.com', \
    'DNT': '1',\
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',\
    'Connection': 'keep-alive'}

def get_permuations():
    #return product("ab", repeat=2)
    return product(ascii_lowercase+digits, repeat=2)

def get_number_images(i, q):
    global total_images
    pre_url="https://store.docker.com/api/content/v1/products/search?page_size=100&page=1&q="
    post_url="%2B&source=community&type=image%2Cbundle"
    while True:
        pattern = q.get()
        url = '%s%s%s' %(pre_url, pattern, post_url)
        headers = {'Host': 'store.docker.com', \
            'DNT': '1',\
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',\
            'Connection': 'keep-alive'}
        r = requests.get(url, headers=headers)
        number_images = int(r.json()['count'])
        print "%s,%d" %(pattern,number_images) 
        lock.acquire()
        try:
            logging.debug('Acquired a lock')
            total_images += number_images
        finally:
            logging.debug('Released a lock')
            lock.release()
    q.task_done()

'''
Get the numbers pages per pattern
'''
def pages_pattern(pattern):
    url = "%s%s%s" %('https://store.docker.com/api/content/v1/products/search?page_size=100&page=1&q=', \
        pattern, "%2B&source=community&type=image%2Cbundle")

    r = requests.get(url, headers=headers)
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Whoops it wasn't a 200
        logging.error('Unable to get the numbers of pages: %s %s', pattern,e)
    try:
        pages = int(ceil(int(r.json()["count"])/100.0))
        return pages
    except Exception as e:
        logging.error('Unable to get the numbers of pages: %s %s', pattern,e)
'''
Get the full_name of all images in a page by pattern
'''
def images_per_page_pattern(page, pattern):
    url = "%s%s%s%s%s" \
        %('https://store.docker.com/api/content/v1/products/search?page_size=100&page=',\
        page, \
        '&q=', \
        pattern, \
        "%2B&source=community&type=image%2Cbundle")

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

    url = "%s%s%s" %('https://store.docker.com/v2/repositories/', full_name, '/')
    r = requests.get(url, headers=headers)

    try:
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        logging.error('Unable request info: %s  %s', full_name, e)

    return None
'''
Get all the image by pattern
'''
def get_images_per_pattern(i, q):
    pre_url="https://store.docker.com/api/content/v1/products/search?page_size=100&page="
    post_url="%2B&source=community&type=image%2Cbundle"


    while True:
        pattern = q.get()
        logging.info('Get the job %s', pattern)

        page=0
        retries=5     

        pages = pages_pattern(pattern)
        logging.info("Number of pages for %s is ", pattern, pages)

        if pages > 0:
            for page in xrange(1,pages+1):
                logging.debug("Querying the page: %s", page)
                images = images_per_page_pattern(page, pattern)

                for image in images:
                    full_name = image["name"]

                    logging.debug("Get the image: %s ", full_name)
                    image_json = get_data(full_name)
                    valid = valid_insert(full_name)
                    if valid and image_json:
                        new_image = Image(image_json, full_name)
                        new_image.save_to_db()
                        print full_name
                        get_tags(full_name)
                    

        q.task_done()



parser = argparse.ArgumentParser(description='Process some integers.')
parser.add_argument('-t', action="store", dest="threads", default=1)
parser.add_argument('-s', action="store", dest="start", default=0)
parser.add_argument('-e', action="store", dest="end", default=1296)
parser.add_argument('--logfile', action='store_true', default=False,
                    dest='logfile',
                    help='Set a switch to true')
results = parser.parse_args()


logging.basicConfig(filename='dockerpedia.log',
                level=logging.DEBUG,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s ) %(message)s',)


num_fetch_threads = int(results.threads)
start = int(results.start)
end = int(results.end)

pattern_queue = Queue()
permuations = islice(get_permuations(),start,end)
lock = Lock()

# Set up some threads to fetch the enclosures
for i in range(num_fetch_threads):
    worker = Thread(target=get_images_per_pattern, args=(i, pattern_queue,))
    worker.setDaemon(False)
    worker.start()


for pattern in permuations:
    string_pattern = ''.join(pattern)
    pattern_queue.put(string_pattern)


print '*** Main thread waiting'
pattern_queue.join()
print '*** Done'
print total_images




# parser = argparse.ArgumentParser(description='Process some integers.')
# parser.add_argument('-p', action="store", dest="page", default=0)
# results = parser.parse_args()
# permuations = get_permuations()
# total_images = 0
# for i in permuations:
#     pattern = ''.join(i)
#     number_images = get_number_images(pattern)
#     print "%s,%d" %(pattern,number_images)
#     total_images += number_images
# print total_images




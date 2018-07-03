from app import app, db
from app.models import Feature, Layer, Featureversion, Tag, Image
from sqlalchemy import text
from threading import Thread, Lock
from Queue import Queue
import logging
import json
import datetime

def converter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()

def analyze_image(image_id, image):

    cmd = 'select DISTINCT f.id, fv.id, l.id, f.name, fv.version FROM \
        image as repo \
        JOIN tag as image \
            ON repo.id = image.image_id \
        JOIN tag_layer as tl \
            ON image.id = tl.tag_id \
        JOIN layer as l \
            ON tl.layer_id = l.id \
        JOIN layer_diff_featureversion as ld \
            ON ld.layer_id = l.id \
        JOIN featureversion as fv \
            ON ld.featureversion_id = fv.id \
        JOIN feature as f \
            ON f.id = fv.feature_id \
        where image.id=:group \
        ORDER BY l.id DESC'
    result = db.engine.execute(text(cmd), group = image_id)

    packages = {}
    for row in result:
        if not row[0] in packages:
            packages[row[0]] = {'name': row[3], 'version': row[4], 'featureversion': row[1],}



    counter = {'Unknown': 0, 'Negligible': 0, 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0, 'Defcon1': 0}
    for k,v in packages.iteritems():
        for vul in Featureversion.query.get(v['featureversion']).vulnerability_affects_featureversions:
            severity = vul.vulnerability.severity
            counter[severity] += 1
        v['vulnerability'] = counter


    imageDict = {
        'name': image.name,
        #'total_vulnerabilities': total_vulnerabilities,
        'packages': packages,
        'last_updated': converter(image.last_updated)
    }
    return imageDict

def analyze_user(username):
    file = open("jsons/"+username+".json","w")

    imageList = []
    user = {'username': username}
    query = Tag.query.join(Image, Image.id == Tag.image_id).\
            filter(Image.user == username).filter(Tag.last_check.isnot(None))
    for image in query.all():
        imageList.append(analyze_image(image.id, image))
    user["images"] = imageList
    file.write(json.dumps(user))
    file.close()


def check_image(q):
    while True:
        username = q.get()
        analyze_user(username)
        q.task_done()

logging.getLogger('requests').setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s',)


num_fetch_threads = 1
pattern_queue = Queue()
lock = Lock()

for i in range(num_fetch_threads):
    worker = Thread(target=check_image, args=(pattern_queue,))
    worker.setDaemon(True)
    worker.start()


users = ["google","mbabineau","jtarchie","pivotalcf","prom",\
         "gliderlabs","v2tec","kope","zzrot","datadog","portainer","newrelic",\
         "openshift","weaveworks","amazon","atmoz","pivotaldata","sysdig",\
         "pivotalservices","behance","yelp","frodenas","ljfranklin","iron",\
         "centurylink","pcfseceng","cloudfoundry","thefactory","gliderlabs"] 

for username in users:
    pattern_queue.put(username)
pattern_queue.join() 

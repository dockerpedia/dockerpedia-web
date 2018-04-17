from app import app, db
from app.models import Feature, Layer, Featureversion, Tag
from sqlalchemy import text
from threading import Thread, Lock
from Queue import Queue
import logging

def analyze_image(image_id):
    print "Start %s" %(image_id )
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
            packages[row[0]] = row[1]



    counter = {'Unknown': 1, 'Negligible': 1, 'Low': 1, 'Medium': 1, 'High': 1, 'Critical': 1, 'Defcon1': 1}
    for k,v in packages.iteritems():
        for vul in Featureversion.query.get(v).vulnerability_affects_featureversions:
            severity = vul.vulnerability.severity
            counter[severity] += 1

    image = Tag.query.get(image_id)
    image.vulnerabilityunknown = counter['Unknown']
    image.vulnerabilitynegligible = counter['Negligible']
    image.vulnerabilitylow = counter['Low']
    image.vulnerabilitymedium = counter['Medium']
    image.vulnerabilityhigh = counter['High']
    image.vulnerabilitycritical = counter['Critical']
    image.vulnerabilitydefcon1 = counter['Defcon1']
    image.packages = len(packages)
    logging.info("Saving - image_id %s - %s", image_id, image.packages )
    db.session.commit()


def check_image(q):
    while True:
        image_id = q.get()
        analyze_image(image_id)
        q.task_done()

logging.getLogger('requests').setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s',)


num_fetch_threads = 128
pattern_queue = Queue()
lock = Lock()

for i in range(num_fetch_threads):
    worker = Thread(target=check_image, args=(pattern_queue,))
    worker.setDaemon(True)
    worker.start()

query = Tag.query.filter(Tag.last_check.isnot(None))
print query.count()
for image in Tag.query.filter(Tag.last_check.isnot(None)).filter(Tag.packages.is_(None)).limit(100000).all():
    pattern_queue.put(image.id)
pattern_queue.join() 

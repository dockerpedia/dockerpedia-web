from app import app, db
from app.models import Feature, Layer, Featureversion, Tag, Image
from threading import Thread
from Queue import Queue
import logging
from sqlalchemy import text

def calculate_ranking(counter):
    return 1 * counter["Unknown"] + \
            1 * counter["Negligible"] + \
            2 * counter["Low"] + \
            4 * counter["Medium"] + \
            8 * counter["High"] + \
            16 * counter["Critical"] + \
            16 * counter["Defcon1"]


def count_vulnerability(image):
    logging.info("Counting image - %s", image.name)

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
    result = db.engine.execute(text(cmd), group = image.id)

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

    local_image = Tag.query.get(image.id)
    local_image.vulnerabilityunknown = counter['Unknown']
    local_image.vulnerabilitynegligible = counter['Negligible']
    local_image.vulnerabilitylow = counter['Low']
    local_image.vulnerabilitymedium = counter['Medium']
    local_image.vulnerabilityhigh = counter['High']
    local_image.vulnerabilitycritical = counter['Critical']
    local_image.vulnerabilitydefcon1 = counter['Defcon1']
    local_image.score = calculate_ranking(counter)
    local_image.analysed = True
    db.session.commit()



def analyze_repository(repository):
    logging.info("Analyzing repository - %s %s", repository.id, repository.name)
    images = repository.tags
    for image in images:
        if len(image.layers) > 0:
            count_vulnerability(image)
        else:
            logging.warning("checked")

def check_image(q):
    while True:
        repository = q.get()
        analyze_repository(repository)
        q.task_done()

logging.getLogger('requests').setLevel(logging.INFO)
logging.basicConfig(level=logging.INFO,
                format='(%(asctime)s - %(levelname)s - %(name)s - %(threadName)-9s - %(message)s',)

num_fetch_threads = 16
pattern_queue = Queue()

for i in range(num_fetch_threads):
    worker = Thread(target=check_image, args=(pattern_queue,))
    worker.setDaemon(True)
    worker.start()


query = Image.query.join(Tag, Image.id == Tag.image_id).filter(Tag.last_check.isnot(None))
for repository in query.all():
    pattern_queue.put(repository)
pattern_queue.join()

from app import app, db
from app.models import Feature, Layer, Featureversion, Tag, Image, TagFeatureVersion
from threading import Thread
from Queue import Queue
import logging
from sqlalchemy import text


def get_packages(image):
    logging.info("Fetch the package of image - %s (id: %s)", image.name, image.id)
    image_id = image.id
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

    for k,v in packages.iteritems():
        fv_id = v['featureversion']

        if not TagFeatureVersion.query.filter_by(tag_id=image_id, featureversion_id=fv_id).first():
            tf = TagFeatureVersion(tag_id=image_id, featureversion_id=fv_id)
            db.session.add(tf)
            db.session.commit()
        else:
            logging.warning("Duplicate item")

def analyze_repository(repository):
    logging.info("Analyzing repository - %s %s", repository.id, repository.name)
    images = repository.tags
    for image in images:
        if len(image.layers) > 0:
            get_packages(image)
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

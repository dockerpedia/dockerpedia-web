from flask import render_template, json
from app import app
from app.models import Feature, Layer
import pprint

@app.route('/')
@app.route('/index')
def index():
    user = {'username': 'Miguel'}
    posts = [
        {
            'author': {'username': 'John'},
            'body': 'Beautiful day in Portland!'
        },
        {
            'author': {'username': 'Susan'},
            'body': 'The Avengers movie was so cool!'
        }
    ]
    return render_template('index.html', title='Home', user=user, posts=posts)


@app.route('/layers')
@app.route('/layers/')
def layers():
    layers = Layer.query.order_by(Layer.created_at).all()
    return render_template("layers/index.html", title='Explore', layers=layers)




@app.route('/layers/<id>')
def layer(id):
    layer = Layer.query.filter_by(id=id).first_or_404()

    packages = layer.get_feature_installed()
    result = map(lambda x: x['blobSum'], layer.manifest_v1['fsLayers'])

    #history_raw = json.loads(layer.manifest_v1['history'])
    #history = json.dumps(history_raw, sort_keys = True, indent = 4, separators = (',', ': '))

    return render_template("layers/layer.html", title='Explore', packages=packages) #history=history_raw['container_config']['Cmd'])



@app.route('/user/<username>')
def user(username):
    user = User.query.filter_by(username=username).first_or_404()
    posts = [
        {'author': user, 'body': 'Test post #1'},
        {'author': user, 'body': 'Test post #2'}
    ]
    return render_template('user.html', user=user, posts=posts)


@app.route('/features')
def explore():
    features = Feature.query.order_by(Feature.name.asc())
    return render_template("features/index.html", title='Explore', features=features)
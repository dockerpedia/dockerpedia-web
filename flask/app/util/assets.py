from flask_assets import Bundle, Environment
from .. import app

bundles = {
    'admin_css': Bundle(
        'css/common.css',
        output='gen/admin.css')
}

assets = Environment(app)

assets.register(bundles)
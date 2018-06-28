import os
basedir = os.path.abspath(os.path.dirname(__file__))

class Config(object):
    # ...
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_POOL_SIZE = 1024
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    POSTS_PER_PAGE=10
    PER_PAGE = 10
    CSS_FRAMEWORK = 'bootstrap3'
    LINK_SIZE = 'sm'

    # decide whether or not a single page returns pagination
    SHOW_SINGLE_PAGE = False
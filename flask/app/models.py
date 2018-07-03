from app import db

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.schema import FetchedValue
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM
from flask_sqlalchemy import SQLAlchemy




class Feature(db.Model):
    __tablename__ = 'feature'
    __table_args__ = (
        db.UniqueConstraint('namespace_id', 'name'),
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    namespace_id = db.Column(db.ForeignKey(u'namespace.id'), nullable=False)
    name = db.Column(db.String(128), nullable=False)

    namespace = db.relationship(u'Namespace', primaryjoin='Feature.namespace_id == Namespace.id', backref=u'features')


class Featureversion(db.Model):
    __tablename__ = 'featureversion'
    __table_args__ = (
        db.Index('featureversion_feature_id_version_key', 'feature_id', 'version'),
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    feature_id = db.Column(db.ForeignKey(u'feature.id'), nullable=False, index=True)
    version = db.Column(db.String(128), nullable=False)

    feature = db.relationship(u'Feature', primaryjoin='Featureversion.feature_id == Feature.id', backref=u'featureversions')




class Keyvalue(db.Model):
    __tablename__ = 'keyvalue'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), nullable=False, unique=True)
    value = db.Column(db.Text)


class Image(db.Model):
    __tablename__ = 'image'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    user = db.Column(db.String(255))
    namespace = db.Column(db.String(255))
    full_name = db.Column(db.String(255))
    repository_type  = db.Column(db.String(255))
    status = db.Column(db.Boolean())
    description = db.Column(db.String(255))
    is_automated = db.Column(db.Boolean())
    star_count =  db.Column(db.BigInteger)
    pull_count =  db.Column(db.BigInteger)
    last_updated = db.Column(db.DateTime(True))
    affiliation =  db.Column(db.String(255))
    tags_checked = db.Column(db.DateTime(True))
    official = db.Column(db.Boolean())
    score = db.Column(db.Integer)

    tags = db.relationship('Tag', backref='image', lazy=True)


class Tag(db.Model):
    __tablename__ = 'tag'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    last_updated = db.Column(db.DateTime(True))

    full_size = db.Column(db.BigInteger)
    id_docker = db.Column(db.BigInteger)

    last_check = db.Column(db.DateTime(True))
    last_try = db.Column(db.DateTime(True))

    image_id = db.Column(db.Integer, db.ForeignKey('image.id'), index=True)
    status = db.Column(db.Boolean())

    vulnerabilityunknown = db.Column(db.Integer)
    vulnerabilitynegligible = db.Column(db.Integer)
    vulnerabilitylow = db.Column(db.Integer)
    vulnerabilitymedium = db.Column(db.Integer)
    vulnerabilityhigh = db.Column(db.Integer)
    vulnerabilitycritical = db.Column(db.Integer)
    vulnerabilitydefcon1 = db.Column(db.Integer)

    packages = db.Column(db.Integer)
    score = db.Column(db.Integer)

    layers = db.relationship("TagLayer")
    analysed = db.Column(db.Boolean, default=False)


class Layer(db.Model):
    __tablename__ = 'layer'

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(128), nullable=False, unique=True)
    engineversion = db.Column(db.SmallInteger, nullable=False)
    parent_id = db.Column(db.ForeignKey(u'layer.id', ondelete=u'CASCADE'), index=True)
    namespace_id = db.Column(db.ForeignKey(u'namespace.id'), index=True)
    created_at = db.Column(db.DateTime(True))
    manifest = db.Column(db.JSON)
    manifest_v1 = db.Column(db.JSON)
    parent_name = db.Column(db.String(128))

    namespace = db.relationship(u'Namespace', primaryjoin='Layer.namespace_id == Namespace.id', backref=u'layers')
    parent = db.relationship(u'Layer', remote_side=[id], primaryjoin='Layer.parent_id == Layer.id', backref=u'layers')

    def get_feature_installed(self):
        return Featureversion.query.join(\
            LayerDiffFeatureversion, \
            (Featureversion.id == LayerDiffFeatureversion.featureversion_id) & \
            (LayerDiffFeatureversion.layer_id==self.id))


class TagLayer(db.Model):
    __tablename__ = 'tag_layer'

    id = db.Column(db.Integer, primary_key=True)
    tag_id = db.Column(db.ForeignKey('tag.id', ondelete=u'CASCADE'), nullable=False, index=True)
    layer_id = db.Column(db.ForeignKey('layer.id', ondelete=u'CASCADE'),  nullable=False, index=True)

    layer = db.relationship(u'Layer', primaryjoin='TagLayer.layer_id == Layer.id', backref=u'tag_layers')
    tag = db.relationship(u'Tag', primaryjoin='TagLayer.tag_id == Tag.id', backref=u'tag_layers')



class TagFeatureVersion(db.Model):
    __tablename__ = 'tag_featureversion'

    __table_args__ = (
        db.UniqueConstraint('tag_id', 'featureversion_id'),
        db.Index('featureversion_feature_id_tag_key', 'tag_id', 'featureversion_id')

    )


    id = db.Column(db.Integer, primary_key=True)
    tag_id = db.Column(db.ForeignKey('tag.id', ondelete=u'CASCADE'), nullable=False, index=True)
    featureversion_id = db.Column(db.ForeignKey('featureversion.id', ondelete=u'CASCADE'),  nullable=False, index=True)

    featureversion = db.relationship(u'Featureversion', primaryjoin='TagFeatureVersion.featureversion_id == Featureversion.id', backref=u'tag_featureversions')
    tag = db.relationship(u'Tag', primaryjoin='TagFeatureVersion.tag_id == Tag.id', backref=u'tag_featureversions')


class LayerDiffFeatureversion(db.Model):
    __tablename__ = 'layer_diff_featureversion'
    __table_args__ = (
        db.UniqueConstraint('layer_id', 'featureversion_id'),
        db.Index('layer_diff_featureversion_layer_id_modification_idx', 'layer_id', 'modification'),
        db.Index('layer_diff_featureversion_featureversion_id_layer_id_idx', 'featureversion_id', 'layer_id')
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    layer_id = db.Column(db.ForeignKey(u'layer.id', ondelete=u'CASCADE'), nullable=False, index=True)
    featureversion_id = db.Column(db.ForeignKey(u'featureversion.id'), nullable=False, index=True)
    modification = db.Column(ENUM(u'add', u'del', name='modification'), nullable=False)

    featureversion = db.relationship(u'Featureversion', primaryjoin='LayerDiffFeatureversion.featureversion_id == Featureversion.id', backref=u'layer_diff_featureversions')
    layer = db.relationship(u'Layer', primaryjoin='LayerDiffFeatureversion.layer_id == Layer.id', backref=u'layer_diff_featureversions')

    def __repr__(self):
        return '<Layer_id {} featureversion_id {} >'.format(self.featureversion_id, self.layer_id)



class Lock(db.Model):
    __tablename__ = 'lock'

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(64), nullable=False, unique=True)
    owner = db.Column(db.String(64), nullable=False, index=True)
    until = db.Column(db.DateTime(True))


class Namespace(db.Model):
    __tablename__ = 'namespace'

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(128), unique=True)
    version_format = db.Column(db.String(128))


class SchemaMigration(db.Model):
    __tablename__ = 'schema_migrations'

    version = db.Column(db.Integer, primary_key=True)


class Vulnerability(db.Model):
    __tablename__ = 'vulnerability'
    __table_args__ = (
        db.Index('vulnerability_namespace_id_name_idx', 'namespace_id', 'name'),
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    namespace_id = db.Column(db.ForeignKey(u'namespace.id'), nullable=False)
    name = db.Column(db.String(128), nullable=False, index=True)
    description = db.Column(db.Text)
    link = db.Column(db.String(128))
    severity = db.Column(ENUM(u'Unknown', u'Negligible', u'Low', u'Medium', u'High', u'Critical', u'Defcon1', name='severity'), nullable=False)
    metadata2 = db.Column(db.Text, name="metadata")
    created_at = db.Column(db.DateTime(True))
    deleted_at = db.Column(db.DateTime(True))

    namespace = db.relationship(u'Namespace', primaryjoin='Vulnerability.namespace_id == Namespace.id', backref=u'vulnerabilities')


class VulnerabilityAffectsFeatureversion(db.Model):
    __tablename__ = 'vulnerability_affects_featureversion'
    __table_args__ = (
        db.UniqueConstraint('vulnerability_id', 'featureversion_id'),
        db.Index('vulnerability_affects_feature_featureversion_id_vulnerabili_idx', 'featureversion_id', 'vulnerability_id')
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    vulnerability_id = db.Column(db.ForeignKey(u'vulnerability.id', ondelete=u'CASCADE'), nullable=False)
    featureversion_id = db.Column(db.ForeignKey(u'featureversion.id'), nullable=False)
    fixedin_id = db.Column(db.ForeignKey(u'vulnerability_fixedin_feature.id', ondelete=u'CASCADE'), nullable=False, index=True)

    featureversion = db.relationship(u'Featureversion', primaryjoin='VulnerabilityAffectsFeatureversion.featureversion_id == Featureversion.id', backref=u'vulnerability_affects_featureversions')
    fixedin = db.relationship(u'VulnerabilityFixedinFeature', primaryjoin='VulnerabilityAffectsFeatureversion.fixedin_id == VulnerabilityFixedinFeature.id', backref=u'vulnerability_affects_featureversions')
    vulnerability = db.relationship(u'Vulnerability', primaryjoin='VulnerabilityAffectsFeatureversion.vulnerability_id == Vulnerability.id', backref=u'vulnerability_affects_featureversions')

    def get_vul(self, severity):
        return Vulnerability.query.join(\
            VulnerabilityAffectsFeatureversion, \
            (self.id == Vulnerability.id)).filter(Vulnerability.severity == severity)

    def __repr__(self):
        return '{}-{}'.format(self.vulnerability.name, self.vulnerability.severity)


class VulnerabilityFixedinFeature(db.Model):
    __tablename__ = 'vulnerability_fixedin_feature'
    __table_args__ = (
        db.UniqueConstraint('vulnerability_id', 'feature_id'),
        db.Index('vulnerability_fixedin_feature_feature_id_vulnerability_id_idx', 'feature_id', 'vulnerability_id')
    )

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    vulnerability_id = db.Column(db.ForeignKey(u'vulnerability.id', ondelete=u'CASCADE'), nullable=False)
    feature_id = db.Column(db.ForeignKey(u'feature.id'), nullable=False)
    version = db.Column(db.String(128), nullable=False)

    feature = db.relationship(u'Feature', primaryjoin='VulnerabilityFixedinFeature.feature_id == Feature.id', backref=u'vulnerability_fixedin_features')
    vulnerability = db.relationship(u'Vulnerability', primaryjoin='VulnerabilityFixedinFeature.vulnerability_id == Vulnerability.id', backref=u'vulnerability_fixedin_features')


class VulnerabilityNotification(db.Model):
    __tablename__ = 'vulnerability_notification'

    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(64), nullable=False, unique=True)
    created_at = db.Column(db.DateTime(True))
    notified_at = db.Column(db.DateTime(True), index=True)
    deleted_at = db.Column(db.DateTime(True), index=True)
    old_vulnerability_id = db.Column(db.ForeignKey(u'vulnerability.id', ondelete=u'CASCADE'))
    new_vulnerability_id = db.Column(db.ForeignKey(u'vulnerability.id', ondelete=u'CASCADE'))

    new_vulnerability = db.relationship(u'Vulnerability', primaryjoin='VulnerabilityNotification.new_vulnerability_id == Vulnerability.id', backref=u'vulnerability_vulnerability_notifications')
    old_vulnerability = db.relationship(u'Vulnerability', primaryjoin='VulnerabilityNotification.old_vulnerability_id == Vulnerability.id', backref=u'vulnerability_vulnerability_notifications_0')

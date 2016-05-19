import logging
import json

from aleph.core import db
from aleph.metadata import Metadata
from aleph.model import Source, Entity, Collection
from aleph.ingest import ingest_url, ingest_file
from aleph.entities import update_entity_full

log = logging.getLogger(__name__)


class Crawler(object):

    def __init__(self):
        pass

    def crawl(self, **kwargs):
        raise NotImplemented()

    def execute(self, **kwargs):
        try:
            self.crawl(**kwargs)
            db.session.commit()
        except Exception as ex:
            log.exception(ex)

    def make_meta(self, data={}):
        data = json.loads(json.dumps(data))
        data['crawler'] = self.__class__.__name__
        return Metadata(data=data)

    def __repr__(self):
        return '<%s()>' % self.__class__.__name__


class EntityCrawler(Crawler):

    def find_collection(self, foreign_id, data):
        collection = Collection.by_foreign_id(foreign_id, data)
        if not hasattr(self, 'entity_cache'):
            self.entity_cache = {}
        self.entity_cache[collection.id] = []
        db.session.flush()
        return collection

    def emit_entity(self, collection, data):
        data['collections'] = [collection]
        entity = Entity.save(data, merge=True)
        db.session.flush()
        update_entity_full.delay(entity.id)
        log.info("Entity [%s]: %s", entity.id, entity.name)
        self.entity_cache[collection.id].append(entity)
        return entity

    def emit_collection(self, collection):
        db.session.commit()
        entities = self.entity_cache.pop(collection.id, [])

        deleted_ids = []
        for entity in collection.entities:
            if entity not in entities:
                entity.delete()
                deleted_ids.append(entity.id)

        db.session.commit()
        for entity_id in deleted_ids:
            update_entity_full.delay(entity_id)


class DocumentCrawler(Crawler):
    SOURCE_ID = None
    SOURCE_LABEL = None

    @property
    def source(self):
        if not hasattr(self, '_source'):
            self._source = Source.create({
                'foreign_id': self.SOURCE_ID,
                'label': self.SOURCE_LABEL or self.SOURCE_ID
            })
            db.session.commit()
        return self._source

    def emit_file(self, meta, file_path, move=False):
        ingest_file(self.source.id, meta.clone(), file_path, move=move)

    def emit_url(self, meta, url):
        ingest_url.delay(self.source.id, meta.clone().data, url)

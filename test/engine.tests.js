var _ = require('lodash')
  , async = require('async')
  , should = require('should')

function insertObjects(engine, objects, callback) {
  if (!Array.isArray(objects)) {
    objects = [objects]
  }
  async.map(objects, engine.create, callback)
}

module.exports = function(idProperty, getEngine, beforeCallback, afterCallback) {

  describe('memory-engine', function() {

    before(function(done) {
      if (typeof beforeCallback === 'function') {
        beforeCallback(done)
      } else {
        done()
      }
    })

    after(function() {
      if (typeof afterCallback === 'function') {
        afterCallback()
      }
    })

    describe('#idProperty', function() {
      it('should return name of the idProperty', function() {
        getEngine(function(error, engine) {
          engine.idProperty.should.eql('_id')
        })
      })
    })

    describe('#create()', function() {

      it('should return the inserted entity with a new id', function(done) {
        getEngine(function(error, engine) {
          engine.create({ a:1 }, function(error, entity) {
            entity.should.have.property(idProperty)
            done()
          })
        })
      })

      it('should emit a \'create\' event', function(done) {
        getEngine(function(error, engine) {
          engine.on('create', function(entity) {
            entity.should.eql({ a:1 })
            done()
          })
          engine.create({ a:1 })
        })
      })

      it('should always create a unique id', function(done) {

        var n = 15
          , c = 1
          , ids = []


        function cb(error, entity) {
          should.not.exist(error)
          if (c >= n) {
            _.uniq(ids).should.eql(ids)
            done()

          } else {
            should.exist(entity[idProperty])
            ids.push(entity[idProperty])
          }

          c += 1
        }

        getEngine(function(error, engine) {
          var item = { a:1 }
          for (var i = 0; i < n; i += 1) {
            engine.create(item, cb)
          }
        })

      })

      it('should return the same object besides the id', function(done) {

        var original = { a:1 }

        getEngine(function(error, engine) {
          engine.create(original, function(error, entity) {

            delete entity[idProperty]

            original.should.eql(entity)

            done()
          })
        })
      })

      it('should allow idProperty to be defined', function(done) {

        var original = {  a: 1 }
        original[idProperty] = '0'

        getEngine(function(error, engine) {
          engine.create(original, function(error, entity) {
            should.not.exist(error)
            entity._id.should.equal('0')
            done()
          })
        })
      })

      it('should not retain reference to original object', function(done) {

        var item = { a: 1 }

        getEngine(function(error, engine) {
          insertObjects(engine, [item, item], function(error) {
            should.not.exist(error)
            engine.find({}, {}, function(error, objects) {
              objects[0][idProperty].should.not.equal(objects[1][idProperty])
              done()
            })
          })
        })
      })

    })


    describe('#read()', function() {

      it('should return undefined if no object is found with given id', function(done) {

        getEngine(function(error, engine) {
          engine.read('999', function(error, entity) {

            should.not.exist(entity)
            should.strictEqual(undefined, entity)
            done()
          })
        })
      })

      it('should emit a \'read\' event', function(done) {
        getEngine(function(error, engine) {
          engine.on('read', function(id) {
            id.should.eql('999')
            done()
          })
          engine.read('999', function() {
          })
        })
      })

      it('should return object if id is found', function(done) {

        var original = { a: 1 }

        getEngine(function(error, engine) {
          engine.create(original, function(error, entity) {

            engine.read(entity[idProperty], function(error, entity) {
              entity.should.eql(entity)
              done()
            })
          })
        })
      })

    })

    describe('#update()', function() {

      it('should return the full entity', function(done) {

        getEngine(function(error, engine) {
          engine.create({ a: 1 }, function(error, insertedObject) {
            should.not.exist(error)
            engine.update(insertedObject, function(error, savedObject) {
              should.not.exist(error)
              savedObject.should.eql(insertedObject)
              done()
            })
          })
        })
      })

      it('should emit a \'update\' event', function(done) {
        getEngine(function(error, engine) {
          engine.create({ a: 1 }, function(error, insertedObject) {
          engine.on('update', function(entity) {
              entity.should.eql(insertedObject)
            done()
          })
            engine.update(insertedObject)
          })
        })
      })

      it('should error if there is no id property', function(done) {
        getEngine(function(error, engine) {
          engine.update({ a: 1 }, function(error) {
            error.message.should.eql('Object has no \'' + idProperty + '\' property')
            done()
          })
        })
      })

      it('should error if there an id property that is null/undefined', function(done) {
        getEngine(function(error, engine) {
          engine.update({ _id: null, a: 1 }, function(error) {
            error.message.should.eql('Object has no \'' + idProperty + '\' property')
            getEngine(function(error, engine) {
              engine.update({ _id: undefined, a: 1 }, function(error) {
                error.message.should.eql('Object has no \'' + idProperty + '\' property')
                done()
              })
            })
          })
        })
      })

      it('should error if there are no objects in the store with given id', function(done) {
        getEngine(function(error, engine) {
          var object = { a: 1 }
          object[idProperty] = 1
          engine.update(object, function(error) {
            error.message.should.eql('No object found with \'' + idProperty + '\' = \'1\'')
            done()
          })
        })
      })

      it('should modify and return object by adding new properties', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, { a: 1 , b: 1}, function(error, objects) {
            var extraSet = { b: 2}
            extraSet[idProperty] = objects[0][idProperty]
            engine.update(extraSet, function(error, savedObject) {
              var compositeObject = _.extend({}, objects[0], extraSet)
              savedObject.should.eql(compositeObject)
              done()
            })
          })
        })
      })

      it('should overwrite original properties when option is passed', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, { a: 1 }, function(error, objects) {
            var newObject = { b: 2 }
            newObject[idProperty] = objects[0][idProperty]
            engine.update(newObject, true, function(error, savedObject) {
              savedObject.should.eql(newObject)
              done()
            })

          })
        })
      })

    })

    describe('#delete()', function() {

      it('should delete the entity', function(done) {
        getEngine(function(error, engine) {
          engine.create({ a: 1 }, function(error, insertedObject) {
            engine.delete(insertedObject[idProperty], function(error) {
              (error === undefined).should.equal(true)
              engine.find(insertedObject, {}, function(error, objects) {

                objects.length.should.eql(0)
                done()
              })
            })
          })
        })
      })

      it('should emit a \'delete\' event', function(done) {
        getEngine(function(error, engine) {
          engine.create({ a: 1 }, function(error, insertedObject) {
            engine.on('delete', function(entity) {
              entity.should.eql(insertedObject[idProperty])
              done()
            })
            engine.delete(insertedObject[idProperty])
          })
        })
      })
    })

    describe('#deleteMany()', function() {

      it('should delete the entity if the delete query matches', function(done) {
        getEngine(function(error, engine) {
          var objectToDelete = { a: 1 }
          insertObjects(engine, [objectToDelete, objectToDelete, { a:2 }, { b:1 }], function() {
            engine.deleteMany(objectToDelete, function(error) {
              should.not.exist(error)

              engine.find({}, {}, function(error, objects) {

                // Assert items have been deleted
                objects.length.should.equal(2)

                // Assert items returned arent deleted ones
                objects.forEach(function(object) {
                  object.should.not.equal(objectToDelete)
                })
                done()
              })
            })
          })
        })
      })


      it('should emit a \'deleteMany\' event', function(done) {
        getEngine(function(error, engine) {
          engine.create({ a: 1 }, function(error, insertedObject) {
          engine.on('deleteMany', function(entity) {
              entity.should.eql(insertedObject)
            done()
          })
            engine.deleteMany(insertedObject)
          })
        })
      })

      it('should not error if there are no objects to delete', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }], function() {
            engine.deleteMany({ a: 5 }, function(error) {
              should.not.exist(error)
              done()
            })
          })
        })
      })

    })

    describe('#find()', function() {

      it('should return empty array when no data matches query ', function(done) {
        getEngine(function(error, engine) {
          engine.find({ a: 1 }, {}, function(error, objects) {

            objects.length.should.eql(0)
            done()
          })
        })

      })

      it('should emit a \'find\' event', function(done) {
        getEngine(function(error, engine) {
          engine.on('find', function(entity) {
            entity.should.eql({ a: 1 })
            done()
          })

          engine.find({ a: 1 }, {}, function() {
          })

        })
      })

      it('should return array of objects for a single clause query that matches existing objects', function(done) {

        getEngine(function(error, engine) {
          insertObjects(engine, { a:1 }, function() {
            engine.find({ a: 1 }, {}, function(error, objects) {
              objects.length.should.not.eql(0)
              objects[0].a.should.equal(1)
              done()
            })
          })
        })

      })

      it('should still return expected objects when callback is second parameter', function(done) {

        getEngine(function(error, engine) {
          insertObjects(engine, { a:1 }, function() {
            engine.find({ a: 1 }, function(error, objects) {
              objects.length.should.not.eql(0)
              objects[0].a.should.equal(1)
              done()
            })
          })
        })

      })


      it('should not error if a query property is not in object collection', function(done) {

        getEngine(function(error, engine) {
          insertObjects(engine, { a:1 }, function() {
            engine.find({ b: 1 }, {}, function(error, objects) {
              should.not.exist(error)
              objects.length.should.eql(0)
              done()
            })
          })
        })

      })

      it('should return array of objects that match all properties in query ', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ findTest:1 }, { findTest:1 }, { findTest:1 }, { b:1 }], function() {
            engine.find({ findTest: 1 }, {}, function(error, objects) {
              objects.length.should.equal(3)
              done()
            })
          })
        })
      })

      it('should return array of all objects for an empty query {}', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:1 }, { a:1 }, { a:1 }, { b:1 }], function() {
            engine.find({}, {}, function(error, objects) {
              objects.length.should.equal(4)
              done()
            })
          })
        })
      })

      it('should return array of objects in ascending order', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:3 }, { a:1 }, { a:2 }], function() {
            engine.find({}, { sort: 'a' }, function(error, objects) {
              objects[0].a.should.equal(1)
              objects[1].a.should.equal(2)
              objects[2].a.should.equal(3)
              done()
            })
          })
        })
      })

      it('should return array of objects in descending order', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:3 }, { a:1 }, { a:2 }], function() {
            engine.find({}, { sort: [['a', 'desc']] }, function(error, objects) {
              objects[0].a.should.equal(3)
              objects[1].a.should.equal(2)
              objects[2].a.should.equal(1)
              done()
            })
          })
        })
      })

      it('should return array of objects in the order given by multiple properties')

    })

    describe('#findOne()', function() {

      it('should return undefined when no data matches query ', function(done) {

        getEngine(function(error, engine) {
          engine.findOne({ a: 1 }, function(error, object) {
            should.not.exist(object)
            done()
          })
        })
      })

      it('should emit a \'findOne\' event', function(done) {
        getEngine(function(error, engine) {
          engine.on('findOne', function(entity) {
            entity.should.eql({ a: 1 })
            done()
          })

          engine.findOne({ a: 1 }, function() {
          })

        })
      })

      it('should return an object for a single clause query that matches an existing object ', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, { a:1 }, function() {
            engine.findOne({ a: 1 }, function(error, object) {
              object.a.should.equal(1)
              done()
            })
          })
        })
      })

      it('should use options to shape results', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:3 }, { a:1 }, { a:2 }], function() {
            engine.findOne({}, { sort: [['a', 'asc']] }, function(error, object) {
              object.a.should.equal(1)
              done()
            })
          })
        })
      })
    })

    describe('#count()', function() {

      it('should return 0 count if no objects match query', function(done) {
        getEngine(function(error, engine) {
          engine.count({}, function(error, count) {
            count.should.equal(0)
            done()
          })
        })
      })

      it('should emit a \'count\' event', function(done) {
        getEngine(function(error, engine) {
          engine.on('count', function(entity) {
            entity.should.eql({ a: 1 })
            done()
          })

          engine.count({ a: 1 }, function() {
          })

        })
      })

      it('should return correct count if objects match query', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:3 }, { a:1 }, { a:2 }, { a:2 }], function() {
            engine.count({ a:2 }, function(error, count) {
              count.should.equal(2)
              done()
            })
          })
        })
      })

      it('should return total count with a {} query', function(done) {
        getEngine(function(error, engine) {
          insertObjects(engine, [{ a:3 }, { a:1 }, { a:2 }, { a:2 }], function() {
            engine.count({}, function(error, count) {
              count.should.equal(4)
              done()
            })
          })
        })
      })
    })
  })
}
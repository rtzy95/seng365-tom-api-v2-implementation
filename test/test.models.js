"use strict";

/**
 * incomplete test suite for model methods.
 * currently just tests some of the more critical ones.
 *
 * assumes that a db is up and running according to the config
 *
 * TODO: add more unit tests
 * TODO: separate out into a file for each model
 */

const
    log = require('../app/lib/logger')({name: __filename, level: 'debug'}),
    chai = require('chai'),
    should = chai.should(),
    config = require('../config/config.js'),
    projects = require('../app/models/projects.model'),
    users = require('../app/models/users.model'),
    rewards = require('../app/models/rewards.model'),
    images = require('../app/models/images.model'),
    pledges = require('../app/models/pledges.model'),
    db = require('../app/lib/db'),
    initDb = require('../app/lib/db.init'),
    validator = require('../app/lib/validator');


const projectTemplate = (username, creatorId) => {
    return {
        title: "My awesome project",
        subtitle: "More awesomeness",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor inccreatorIdcreatorIdunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupcreatorIdatat non procreatorIdent, sunt in culpa qui officia deserunt mollit anim creatorId est laborum.",
        imageUri: "/projects/0/image",
        target: 123400,
        creators: [
            {
                id: creatorId,
                name: username
            }
        ],
        rewards: rewardsTemplate()
    };
};

const pledgeTemplate = (id=1, anonymous=false, amount=500) => {
    return {
        id: id,
        amount: amount,
        anonymous: anonymous,
        card: {
            authToken: '7383134dfd2665961c326579c5dc22d1'
        }
    }
};

const rewardsTemplate = () => {
    return [
        {
            id: 0,
            amount: 500,
            description: "Cheap and cheerful"
        },
        {
            id: 1,
            amount: 1000,
            description: "For the discerning"
        }
    ]
};


const createUser = user => {
    return new Promise((resolve, reject) => {
        users.insert(user, (err, userId) => {
            if (err) return reject(err);
            return resolve(userId);
        })
    })
};

const createProject = project => {
    return new Promise((resolve, reject) => {
        projects.insert(project, (err, projectId) => {
            if (err) return reject(err);
            return resolve(projectId);
        })
    })
};

const pledgeToProject = (projectId, userId) => {
    return new Promise((resolve, reject) => {
        pledges.insert(projectId, pledgeTemplate(userId, false, 250), (err, pledgeId) => {
            if (err) return reject(err);
            return resolve(pledgeId);
        })
    })
};

describe('given a clean db', function() {
    
    beforeEach(`clean db`, function() {
        return initDb(config.get('db'))
            .catch(err => {
                console.log(err);
                process.exit(1);
            })
    });

    beforeEach(`Establish connection`, function(done) {
        db.connect(config.get('db'), err => {
            if (err) return done(err);
            return done();
        })
    });

    describe('With a single user', function(done) {

        let user1Id;
        
        beforeEach(`create user`, function() {
            return createUser({username: 'loki', email:'loki@valhalla.biz', password:'toki'})
                .then(_id => user1Id = _id)
        });
        
        it('insert project', function () {
            return createProject(projectTemplate('loki', user1Id))
                .then(id => id.should.equal(1))
        });

        it('delete user and check auth', function (done) {
            users.authenticate('loki', 'toki', result => {
                result.should.be.true;
                users.remove(user1Id, (err, results) => {
                    users.authenticate('loki', 'toki', result => {
                        result.should.be.false;
                        return done();
                    })
                })
            })
        });

        it('delete user and check idFromToken', function (done) {
            users.authenticate('loki', 'toki', result => {
                result.should.be.true;
                users.remove(user1Id, (err, results) => {
                    users.authenticate('loki', 'toki', result => {
                        result.should.be.false;
                        return done();
                    })
                })
            })
        });

        it('delete user and check not shown', function (done) {
            users.remove(user1Id, () => {
                users.getOne(user1Id, true, (err, user) => {  // only active users
                    should.equal(user, null);
                    users.getOne(user1Id, false, (err, user) => {  // include deleted users
                        user.id.should.equal(user1Id);
                        return done();
                    })
                })
            })
        });

    });

    describe('With a user and a project', function(done) {

        let user1Id, project1Id;

        beforeEach('Create project', function() {
            return createUser({username: 'loki', email:'loki@valhalla.biz', password:'toki'})
                .then(_id => user1Id = _id)
                .then(() => createProject(projectTemplate('loki', user1Id)))
                .then(_id => project1Id = _id);
        });

        it('get project', function (done) {
            projects.getOne(project1Id, (err, project) => {
                should.equal(err, null);
                validator.isValidSchema(project, 'definitions.ProjectDetails');
                return done();
            })
        });

        it('get undefined project', function (done) {
            projects.getOne(123, (err, results) => {
                should.equal(err, null);
                should.equal(results, null);
                return done();
            })
        });

        it('update rewards', function(done) {
            rewards.update(project1Id, rewardsTemplate(), err => {
                should.equal(err, null);
                return done();
            })
        });

        it('make pledge', function(done) {
            pledges.insert(project1Id, pledgeTemplate(), (err, id) => {
                should.equal(err, null);
                Number.isInteger(id).should.be.true;
                return done();
            })
        });

        it('get anonymous pledges', function(done) {
            pledges.insert(project1Id, pledgeTemplate(1, true), (err, id) => {
                projects.getOne(project1Id, (err, project) => {
                    should.equal(err, null);
                    validator.isValidSchema(project, 'definitions.ProjectDetails').should.be.true;
                    project.backers[0].username.should.equal("anonymous");
                    return done();
                })
            })
        });

        it('get undefined image', function (done) {
            images.get(123, (err, results) => {
                should.equal(results, null);
                return done()
            })
        });

        it('put status change', function (done) {
            projects.update(project1Id, false, err => {
                should.equal(err, null);
                // TODO: check that status has changed to closed
                return done();
            })
        })

    });

    describe('With a user and two projects', function(done) {

        let user1Id, project1Id, project2Id;

        beforeEach('Create project', function() {
            let project;
            return createUser({username: 'loki', email:'loki@valhalla.biz', password:'toki'})
                .then(_id => user1Id = _id)
                .then(() => project = projectTemplate('loki', user1Id))
                .then(() => createProject(Object.assign(project, {title: "Project1"})))
                .then(_id => project1Id = _id)
                .then(() => createProject(Object.assign(project, {title: "Project2"})))
                .then(_id => project2Id = _id)
        });

        it('get projects', function (done) {
            projects.getAll({limit:10}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(2);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                return done();
            })
        });

        it('get projects with offset 1 (last project)', function (done) {
            projects.getAll({limit:10, offset:1}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(1);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                results[0].title.should.equal('Project2'); // ordered from least recent to most recent
                return done();
            })
        });

        it('get projects with limit 1 (first project)', function (done) {
            projects.getAll({limit:1}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(1);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                results[0].title.should.equal('Project1'); // ordered from least recent to most recent
                return done();
            })
        });

        it('get projects with open=true', function (done) {
            projects.getAll({open:true}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(1);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                return done();
            })
        });

        it('check totals', function (done) {
            pledges.insert(project1Id, pledgeTemplate(user1Id, false, 250), (err, id) => {
                pledges.getTotals(project1Id, (err, totals) => {
                    should.not.equal(totals, null);
                    totals.total.should.equal(250);
                    totals.backers.should.equal(1);
                    return done();
                })
            })
        });

    });

    describe('With a two users each with one project, each pledging to the other project', function(done) {

        let user1Id, user2Id, project1Id, project2Id;

        beforeEach('Create project', function() {
            return createUser({username: 'loki', email:'loki@valhalla.biz', password:'toki'})
                .then(_id => user1Id = _id)
                .then(() => createUser({username: 'toki', email:'toki@valhalla.biz', password:'loki'}))
                .then(_id => user1Id = _id)
                .then(() => createProject(projectTemplate('loki', user1Id))) // user1 creates project1
                .then(_id => project1Id = _id)
                .then(() => createProject(projectTemplate('toki', user2Id))) // user2 creates project2
                .then(_id => project2Id = _id)
                .then(() => pledgeToProject(project1Id, user2Id))  // user2 pledges to project1
                .then(() => pledgeToProject(project2Id, user1Id))  // user1 pledges to project2
        });

        it('get projects with creator=1 (loki) should return just project1', function (done) {
            projects.getAll({creator: user1Id}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(1);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                results[0].creators[0].username.should.equal('loki');
                results[0].backers[0].id.should.equal(user1Id);
                results[0].id.should.equal(project1Id);
                return done();
            })
        });

        it('get projects with backer=1 (loki) should return just project2', function (done) {
            projects.getAll({backer: user1Id}, (err, results) => {
                should.equal(err, null);
                results.should.have.lengthOf(1);
                validator.isValidSchema(results, 'definitions.ProjectsOverview').should.be.true;
                results[0].backers[0].username.should.equal('loki');
                results[0].backers[0].id.should.equal(user1Id);
                results[0].id.should.equal(project2Id);
                return done();
            })
        });

    });
});
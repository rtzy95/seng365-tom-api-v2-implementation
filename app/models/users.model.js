"use strict";

/**
 * users
 *
 * by using ? placeholders in mysql module queries, all are automatically escaped against injection attacks (https://www.npmjs.com/package/mysql#preparing-queries)
 */

const
    crypto = require('crypto'),
    db = require('../lib/db.js');

const getHash = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

/**
 * return user details, or null if user not found
 *
 * @param id
 * @param activeOnly    if true, only return active (non-deleted) users
 * @param done
 */
const getOne = (id, activeOnly, done) => {
    let query = 'SELECT id, username, location, email FROM users WHERE id=?';
    if (activeOnly)
        query += ' AND deleted=false';
    db.get().query(
        query,
        [id],
        (err, users) => {
            if (err)
                return done(err);
            return done(err, users.length>0 ? users[0] : null);
        }
    )
};

/**
 * insert user
 *
 * @param user
 * @param done
 */
const insert = (user, done) => {

    const salt = crypto.randomBytes(64);
    const hash = getHash(user.password, salt);

    db.get().query(
        'INSERT INTO users (username, location, email, hash, salt) VALUES (?)',
        [[user.username, user.location, user.email, hash, salt.toString('hex')]],
        (err, results) => {
            if (err)
                return done(err);
            return done(err, results.insertId)
        }
    );
};

/**
 * update user
 *
 * @param id
 * @param user
 * @param done
 */
const alter = (id, user, done) => {

    const salt = crypto.randomBytes(64);
    const hash = getHash(user.password, salt);

    db.get().query(
        'UPDATE users SET username=?, location=?, email=?, hash=?, salt=? WHERE id=?',
        [user.username, user.location, user.email, hash, salt.toString('hex'), id],
        (err, results) => done(err)
    )
};

/**
 * mark user as deleted
 *
 * @param id
 * @param done
 */
const remove = (id, done) => {
    db.get().query(
        'UPDATE users SET deleted=true WHERE id=?',
        [id],
        err => {return done(err)}
    )
};

/**
 * check password is correct for user
 * @param username
 * @param password
 * @param done  true if password is correct
 */
const authenticate = (username, password, done) => {
    db.get().query(
        'SELECT hash, salt FROM users WHERE username=? AND deleted=false',
        [username],
        (err, results) => {
            if (err || results.length === 0)
                return done(false);
            else {
                let salt = Buffer.from(results[0].salt, 'hex');
                return done(results[0].hash === getHash(password, salt))
            }
        }
    )
};

/**
 * create and store a new token for a user
 *
 * @param username
 * @param done
 */
const setToken = (username, done) => {
    let token = crypto.randomBytes(16).toString('hex');
    db.get().query(
        'UPDATE users SET token=? WHERE username=?',
        [token, username],
        err => {return done(err, token)}
    )
};

/**
 * remove the token for a user
 *
 * @param token
 * @param done
 */
const removeToken = (token, done) => {
    db.get().query(
        'UPDATE users SET token=null WHERE token=?',
        [token],
        err => {return done(err)}
    )
};

/**
 * get the user id associated with a given token, return null if not found
 *
 * @param token
 * @param done
 * @returns {*}
 */
const getIdFromToken = (token, done) => {
    if (token === undefined || token === null)
        return done(true, null);
    else {
        db.get().query(
            'SELECT id FROM users WHERE token=? AND deleted=false',
            [token],
            (err, result) => {
                if (result.length === 1)
                    return done(null, result[0].id);
                return done(err, null);
            }
        )
    }
};

module.exports = {
    getOne: getOne,
    insert: insert,
    alter: alter,
    remove: remove,
    authenticate: authenticate,
    setToken: setToken,
    removeToken: removeToken,
    getIdFromToken: getIdFromToken
};

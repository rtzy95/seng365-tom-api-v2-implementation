# Crowdfunding API v2 service implementation

A reference implementation for the api specification in `config/swagger-api-v2.1.json`.

The code is based on the skeletons from labs 3 and 4, and so has a mix of callbacks and promises, with extensions to the lab framework mostly being promise-based.

## Usage

To start the backend service, and initialise the database, `npm start`, or `node server.js` or `docker-compose up -d`.

## Configuration

Configuration defaults are in `config/config.js`. These can be overridden in two ways (in priority order):

1. By environment variable, or command line parameter, to override any individual configuration setting. See `config/config.js` for options.
1. By values given in a javascript file in `config` named in the environment variable `NODE_ENV`, or the command line parameter `env`.
For example, if the service is started with `node server.js --env=production`, the configuration in `config/production.js` will override any default values
(but not individual values set through the environment or command line).

The default configuration assumes that a MySQL database can be found at `mysql://localhost:6033`, and will start the service running
on `http://localhost:4941/api/v2`.

For use with the department's `mysql2` MySQL server, create a config file in `config/production.json` based on the following
and start the service with `node server.js --env=production`:

```
{
    "db": {
        "host": "mysql2.csse.canterbury.ac.nz",
        "port": 3306,
        "user": <your UC usercode>,
        "password": <your assigned password - see email from beginning Term 3>,
        "database": <your UC usercode>
    }
}
```

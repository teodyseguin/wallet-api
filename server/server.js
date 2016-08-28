'use strict';

const bodyParser = require('body-parser'),
    env = process.env.NODE_ENV || 'dev',
    express = require('express'),
    dataconf = require('./config')[env],
    dbService = require('./services/dbconnection'),
    logger = require('./services/logger').logger,
    passport = require('passport'),
    userRouter = require('./components/user/user-router'),
    authRouter = require('./components/auth/auth-router');

let app = express();

app.use(bodyParser.json());

// API to authenticate incoming user
app.use('/v1/wallet/api/auth', authRouter);
// API to create a user
app.use('/v1/wallet/api/users', userRouter);

(function() {
    if (!dbService.getConnection()) {
        let connectionOptions = {
            db: { native_parser: true },
            server: { poolSize: 5 },
            replset: { rs_name: 'myReplicaSetName' },
            user: dataconf.mongodb.username,
            pass: dataconf.mongodb.password,
            promiseLibrary: require('bluebird')
        };

        dbService.connect(
            dataconf.mongodb.host,
            dataconf.mongodb.dbname,
            dataconf.mongodb.port,
            connectionOptions,
            (err) => {
                if (err) {
                    logger(err);
                    logger('can\'t connect to MLab')
                    return;
                }

                logger('> Connected to MLab');
                logger('> Initiating the App');

                let server = app.listen(3000, function () {
                    let host = server.address().address;
                    let port = server.address().port;

                    logger('> Wallet API Started!', host == '::' ? 'localhost': host, port);
                });

                let authService = require('./components/auth/auth-service');

                app.use(passport.initialize());
                app.use(passport.session());

                passport.use(authService.localStrategy);
                passport.serializeUser(authService.serializeUser);
                passport.deserializeUser(authService.deserializeUser);
        });
    }
})();

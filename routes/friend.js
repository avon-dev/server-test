const winston = require('../config/winston');
const { clientIp, isLoggedIn, isNotLoggedIn } = require('./middlewares');

const express = require('express');
const { User, Friend } = require('../models');
const passport = require('passport');
const router = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
// const sequelize = new Sequelize(config.url, config);

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(
        config.database,
        config.username,
        config.password,
        config
    );
}

// Friend CRUD API

// 친구 추가
router.post('/', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;
        const user_nickname = req.user.nickname;
        const friend_uid = req.body.user_uid;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 추가 Request`);
        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] friend_uid : ${friend_uid}`);


        // 본인을 친구 추가 시 에러 출력
        if (friend_uid == user_uid) {
            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '나 자신을 추가할 수 없습니다. 나 자신은 인생의 영원한 친구입니다.';
            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(200).send(result);
        }

        // 사용자 테이블에서 이메일로 사용자 검색
        // SELECT user_uid, email, nickname, portrait, introduction FROM users WHERE user_uid=:user_uid;
        await User.findOne({
            attributes: ['user_uid', 'email', 'nickname', 'portrait', 'introduction'],
            where: {
                user_uid: friend_uid
            }
        }).then((user) => {
            // 사용자 테이블 조회를 성공한 경우
            if (user == null) {
                // 사용자 테이블에서 사용자 검색에 실패한 경우
                const result = new Object();
                result.success = false;
                result.data = 'NONE';
                result.message = '사용자를 찾을 수 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 사용자 테이블에서 사용자 검색에 성공한 경우
                // 프론트에 돌려줄 검색 데이터 객체 새로 생성
                const searchData = new Object();
                searchData.user_uid = user.user_uid;
                searchData.email = user.email;
                searchData.nickname = user.nickname;
                searchData.portrait = user.portrait;
                searchData.introduction = user.introduction;

                // 친구 테이블에 친구 데이터가 있는지 검색
                // SELECT * FROM friends WHERE user_uid IN(:user_uid, :friend_uid) AND friend_uid IN(:user_uid, :friend_uid);
                Friend.findOne({
                    where: {
                        user_uid: {
                            [Op.in]: [user_uid, friend_uid]
                        },
                        friend_uid: {
                            [Op.in]: [user_uid, friend_uid]
                        }
                    }
                }).then((friend) => {
                    // 친구 테이블 조회를 성공한 경우
                    if (friend == null) {
                        // 검색 후 결과 값이 NULL인 경우(친구 테이블에 친구 데이터가 없는 경우) 
                        // 친구 테이블에 친구 데이터 추가
                        // INSERT INTO friends VALUES(:user_uid, :friend_uid, :type);
                        Friend.create({
                            user_uid: user_uid,
                            friend_uid: friend_uid,
                            type: 1,
                        }).then(() => {
                            // 친구 추가를 성공한 경우
                            searchData.type = 1;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            result.message = user_nickname + '이 ' + searchData.nickname + '에게 친구 요청을 보냈습니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(201).send(result);
                        }).catch(error => {
                            // 친구 추가를 실패한 경우
                            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 추가 실패 \n ${error.stack}`);

                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '친구 요청 과정에서 에러가 발생하였습니다.';
                            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(500).send(result);
                        });
                    } else {
                        // 검색 후 결과 값이 NOT NULL인 경우(친구 테이블에 친구 데이터가 있는 경우)
                        if (friend.type == 0) {
                            // LEFT가 RIGHT에게 친구 요청을 보내고 거절당한 경우
                            if (friend.user_uid == user_uid) {
                                // 내가 LEFT인 경우
                                // 다시 친구요청을 보냄
                                // UPDATE friends SET type=:type WHERE (user_uid=:user_uid AND friend_uid=:friend_uid) OR (user_uid=:friend_uid AND friend_uid=:user_uid); 
                                Friend.update({
                                    type: 1
                                }, {
                                    where: {
                                        [Op.or]: [{
                                            user_uid: user_uid,
                                            friend_uid: friend_uid
                                        }, {
                                            user_uid: friend_uid,
                                            friend_uid: user_uid
                                        }]
                                    }
                                }).then(() => {
                                    // 친구 추가를 성공한 경우
                                    searchData.type = 1;

                                    const result = new Object();
                                    result.success = true;
                                    result.data = searchData;
                                    result.message = user_nickname + '이 ' + searchData.nickname + '에게 친구 요청을 보냈습니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }).catch(error => {
                                    // 친구 추가를 실패한 경우
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 추가 실패 \n ${error.stack}`);

                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '친구 요청 과정에서 에러가 발생하였습니다.';
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(500).send(result);
                                });
                            } else {
                                // 내가 RIGHT인 경우
                                // 친구 요청을 보내는 동시에 LEFT와 RIGHT의 위치를 바꿈
                                // UPDATE friends SET type=:type WHERE (user_uid=:user_uid AND friend_uid=:friend_uid) OR (user_uid=:friend_uid AND friend_uid=:user_uid); 
                                Friend.update({
                                    user_uid: friend.friend_uid,
                                    friend_uid: friend.user_uid,
                                    type: 1
                                }, {
                                    where: {
                                        [Op.or]: [{
                                            user_uid: user_uid,
                                            friend_uid: friend_uid
                                        }, {
                                            user_uid: friend_uid,
                                            friend_uid: user_uid
                                        }]
                                    }
                                }).then(() => {
                                    // 친구 추가를 성공한 경우
                                    searchData.type = 1;

                                    const result = new Object();
                                    result.success = true;
                                    result.data = searchData;
                                    result.message = user_nickname + '이 ' + searchData.nickname + '에게 친구 요청을 보냈습니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }).catch(error => {
                                    // 친구 추가를 실패한 경우
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 추가 실패 \n ${error.stack}`);

                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '친구 요청 과정에서 에러가 발생하였습니다.';
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(500).send(result);
                                });
                            }
                        }
                        else if (friend.type == 1) {
                            // 친구 요청을 보낸 경우
                            if (friend.user_uid == user_uid) {
                                // 내가 LEFT인 경우
                                const result = new Object();
                                result.success = false;
                                result.data = 'NONE';
                                result.message = '이미 친구 요청을 보낸 사용자입니다.';
                                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                return res.status(200).send(result);
                            } else {
                                // 내가 RIGHT인 경우
                                // 이미 LEFT가 RIGHT에게 친구 요청을 보낸 경우 친구 정보 UPDATE
                                // UPDATE friends SET type=:type WHERE (user_uid=:user_uid AND friend_uid=:friend_uid) OR (user_uid=:friend_uid AND friend_uid=:user_uid); 
                                Friend.update({
                                    type: 2
                                }, {
                                    where: {
                                        [Op.or]: [{
                                            user_uid: user_uid,
                                            friend_uid: friend_uid
                                        }, {
                                            user_uid: friend_uid,
                                            friend_uid: user_uid
                                        }]
                                    }
                                }).then(() => {
                                    // 친구 추가를 성공한 경우
                                    searchData.type = 2;

                                    const result = new Object();
                                    result.success = true;
                                    result.data = searchData;
                                    result.message = user_nickname + '이 ' + searchData.nickname + '의 친구 요청을 수락해서 친구가 되었습니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }).catch(error => {
                                    // 친구 추가를 실패한 경우
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 추가 실패 \n ${error.stack}`);

                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '친구 요청 수락 과정에서 에러가 발생하였습니다.';
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(500).send(result);
                                });
                            }
                        } else {
                            // 서로 친구 관계이거나 차단한 경우
                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '서로 친구이거나 차단한 사용자입니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        }
                    }
                }).catch(error => {
                    // 친구 테이블 조회를 실패한 경우
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 테이블 조회 실패 \n ${error.stack}`);

                    const result = new Object();
                    result.success = false;
                    result.data = 'NONE';
                    result.message = '친구 조회 과정에서 에러가 발생하였습니다.';
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                    return res.status(500).send(result);
                });

            }
        }).catch(error => {
            // 사용자 테이블 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 사용자 테이블 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '사용자 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 친구 추가 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 검색
router.post('/search', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;
        const email = req.body.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 검색 Request`);
        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] email : ${email}`);

        // 본인 이메일 검색 시 에러 출력
        if (email == user_email) {
            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '나 자신은 인생의 영원한 친구입니다.';
            console.log(result);
            return res.status(200).send(result);
        }

        // 사용자 테이블에서 이메일로 사용자 검색
        // SELECT user_uid, email, nickname, portrait, introduction FROM users WHERE email=:email;
        await User.findOne({
            attributes: ['user_uid', 'email', 'nickname', 'portrait', 'introduction'],
            where: {
                email: email
            }
        }).then((user) => {
            // 사용자 테이블 조회를 성공한 경우
            if (user == null) {
                // 사용자 테이블에서 사용자 검색에 실패한 경우
                const result = new Object();
                result.success = false;
                result.data = 'NONE';
                result.message = '사용자를 찾을 수 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 사용자 테이블에서 사용자 검색에 성공한 경우
                // 프론트에 돌려줄 검색 데이터 객체 새로 생성
                const searchData = new Object();
                searchData.user_uid = user.user_uid;
                searchData.email = user.email;
                searchData.nickname = user.nickname;
                searchData.portrait = user.portrait;
                searchData.introduction = user.introduction;

                // 친구 테이블에 친구 데이터가 있는지 검색
                // SELECT * FROM friends WHERE user_uid IN(:user_uid, :friend_uid) AND friend_uid IN(:user_uid, :friend_uid);
                Friend.findOne({
                    where: {
                        user_uid: {
                            [Op.in]: [user_uid, user.user_uid]
                        },
                        friend_uid: {
                            [Op.in]: [user_uid, user.user_uid]
                        }
                    }
                }).then((friend) => {
                    // 친구 테이블 조회를 성공한 경우
                    if (friend == null) {
                        // 검색 후 결과 값이 NULL인 경우(친구 테이블에 친구 데이터가 없는 경우) 
                        searchData.type = -1;

                        const result = new Object();
                        result.success = true;
                        result.data = searchData;
                        result.message = '아직 친구 요청을 하지 않은 사용자입니다.';
                        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                        return res.status(200).send(result);
                    } else {
                        // 검색 후 결과 값이 NOT NULL인 경우(친구 테이블에 친구 데이터가 있는 경우)
                        // 타입에 따라 다른 리턴값 반환
                        if (friend.type == 0 | friend.type == 1) {
                            // 내가 친구 요청을 한 경우
                            searchData.type = friend.type;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            if (friend.user_uid == user_uid) {
                                result.message = '내가 친구 요청을 한 사용자입니다.';
                            } else {
                                result.message = '내가 친구 요청을 받은 사용자입니다.';
                            }
                            console.log(result);
                            return res.status(200).send(result);
                        } else if (friend.type == 2) {
                            // 이미 서로 친구인 친구를 요청하는 경우
                            searchData.type = friend.type;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            result.message = '이미 친구로 등록된 사용자입니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else if (friend.type == 3) {
                            // 내가 차단한 친구인 경우
                            // 내가 왼쪽인지 오른쪽인지 판단해서 값 리턴해야 함
                            searchData.type = friend.type;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            if (friend.user_uid == user_uid) {
                                result.message = '내가 차단한 사용자입니다.';
                            } else {
                                result.message = '나를 차단한 사용자입니다.';
                            }
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else if (friend.type == 4) {
                            // 친구가 나를 차단한 경우
                            searchData.type = friend.type;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            if (friend.user_uid == user_uid) {
                                result.message = '나를 차단한 사용자입니다.';
                            } else {
                                result.message = '내가 차단한 사용자입니다.';
                            }
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else if (friend.type == 5) {
                            // 서로 차단한 경우
                            searchData.type = friend.type;

                            const result = new Object();
                            result.success = true;
                            result.data = searchData;
                            result.message = '서로 차단한 상태입니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        }
                    }
                }).catch(error => {
                    // 친구 테이블 조회를 실패한 경우
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 테이블 조회 실패 \n ${error.stack}`);

                    const result = new Object();
                    result.success = false;
                    result.data = 'NONE';
                    result.message = '친구 조회 과정에서 에러가 발생하였습니다.';
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                    return res.status(500).send(result);
                });
            }
        }).catch(error => {
            // 사용자 테이블 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 사용자 테이블 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '사용자 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 친구 검색 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 목록
router.get('/', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 목록 Request`);

        let query =
            'SELECT f.id, u.user_uid, u.email, u.nickname, u.portrait, u.introduction, f.type ' +
            'FROM users AS u, ' +
            '(' +
            'SELECT id, friend_uid, type ' +
            'FROM friends ' +
            'WHERE user_uid=:user_uid AND (type=2 OR type=4) AND deletedAt IS NULL ' +
            'UNION ' +
            'SELECT id, user_uid, type ' +
            'FROM friends ' +
            'WHERE friend_uid=:user_uid AND (type=2 OR type=3)AND deletedAt IS NULL' +
            ') AS f ' +
            'WHERE u.user_uid=f.friend_uid ' +
            'ORDER BY u.nickname ASC';
        await sequelize.query(query, {
            replacements: {
                user_uid: user_uid
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        }).then((friendList) => {
            // 정상적으로 친구 목록을 불러온 경우
            if (friendList[0] == null) {
                const result = new Object();
                result.success = true;
                result.data = '';
                result.message = '가져올 친구 목록이 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 친구 목록을 그대로 리턴
                const result = new Object();
                result.success = true;
                result.data = friendList;
                result.message = '친구 목록을 성공적으로 가져왔습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            }
        }).catch(error => {
            // 친구 목록 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 목록 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '친구 목록 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 모든 친구 목록 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 조언자 목록
router.get('/adviser', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 조언자 목록 Request`);

        let query =
            'SELECT f.id, u.user_uid, u.email, u.nickname, u.portrait, u.introduction, f.type ' +
            'FROM users AS u, ' +
            '(' +
            'SELECT id, friend_uid, type ' +
            'FROM friends ' +
            'WHERE user_uid=:user_uid AND type=2 AND deletedAt IS NULL ' +
            'UNION ' +
            'SELECT id, user_uid, type ' +
            'FROM friends ' +
            'WHERE friend_uid=:user_uid AND type=2 AND deletedAt IS NULL' +
            ') AS f ' +
            'WHERE u.user_uid=f.friend_uid ' +
            'ORDER BY u.nickname ASC';
        await sequelize.query(query, {
            replacements: {
                user_uid: user_uid
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        }).then((friendList) => {
            // 정상적으로 조언자 목록을 불러온 경우
            if (friendList[0] == null) {
                const result = new Object();
                result.success = true;
                result.data = '';
                result.message = '가져올 조언자 목록이 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 친구 목록을 그대로 리턴
                const result = new Object();
                result.success = true;
                result.data = friendList;
                result.message = '조언자 목록을 성공적으로 가져왔습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            }
        }).catch(error => {
            // 친구 목록 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 조언자 목록 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '조언자 목록 조회 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 모든 조언자 목록 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});


// 보낸 친구 요청 목록
router.get('/transmission', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 보낸 친구 요청 목록 Request`);

        // 쿼리문 수정 후 테스트(페이징 적용)
        let query =
            'SELECT f.id, u.user_uid, u.email, u.nickname, u.portrait, u.introduction, f.type ' +
            'FROM users AS u, (' +
            'SELECT id, friend_uid, type ' +
            'FROM friends ' +
            'WHERE user_uid=:user_uid AND (type=0 OR type=1) AND deletedAt IS NULL ' +
            ') AS f ' +
            'WHERE u.user_uid=f.friend_uid ' +
            'ORDER BY u.nickname ASC';
        await sequelize.query(query, {
            replacements: {
                user_uid: user_uid
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        }).then((friendList) => {
            // 정상적으로 친구 요청 목록을 불러온 경우
            if (friendList[0] == null) {
                const result = new Object();
                result.success = true;
                result.data = '';
                result.message = '가져올 보낸 친구 요청 목록이 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 친구 목록을 그대로 리턴
                const result = new Object();
                result.success = true;
                result.data = friendList;
                result.message = '보낸 친구 요청 목록을 성공적으로 가져왔습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            }
        }).catch(error => {
            // 친구 요청 목록 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 보낸 친구 요청 목록 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '보낸 친구 요청 목록 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 보낸 친구 요청 목록 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 받은 친구 요청 목록
router.get('/reception', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 받은 친구 요청 목록 Request`);

        let query =
            'SELECT f.id, u.user_uid, u.email, u.nickname, u.portrait, u.introduction, f.type ' +
            'FROM users AS u, (' +
            'SELECT id, user_uid, type ' +
            'FROM friends ' +
            'WHERE friend_uid=:user_uid AND type=1 AND deletedAt IS NULL' +
            ') AS f ' +
            'WHERE u.user_uid=f.user_uid ' +
            'ORDER BY u.nickname ASC';
        await sequelize.query(query, {
            replacements: {
                user_uid: user_uid
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        }).then((friendList) => {
            // 정상적으로 친구 요청 목록을 불러온 경우
            if (friendList[0] == null) {
                const result = new Object();
                result.success = true;
                result.data = '';
                result.message = '가져올 받은 친구 요청 목록이 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 친구 목록을 그대로 리턴
                const result = new Object();
                result.success = true;
                result.data = friendList;
                result.message = '받은 친구 요청 목록을 성공적으로 가져왔습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            }
        }).catch(error => {
            // 친구 요청 목록 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 받은 친구 요청 목록 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '받은 친구 요청 목록 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 받은 친구 요청 목록 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 차단 목록
router.get('/block', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 목록 Request`);

        let query =
            'SELECT f.id, u.user_uid, u.email, u.nickname, u.portrait, u.introduction, f.type ' +
            'FROM users AS u, (' +
            'SELECT id, friend_uid, type ' +
            'FROM friends ' +
            'WHERE user_uid=:user_uid AND (type=3 OR type=5) AND deletedAt IS NULL ' +
            'UNION ' +
            'SELECT id, user_uid, type ' +
            'FROM friends ' +
            'WHERE friend_uid=:user_uid AND (type=4 OR type=5) AND deletedAt IS NULL' +
            ') AS f ' +
            'WHERE u.user_uid=f.friend_uid ' +
            'ORDER BY u.nickname ASC';
        await sequelize.query(query, {
            replacements: {
                user_uid: user_uid
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true
        }).then((friendList) => {
            // 정상적으로 친구 차단 목록을 불러온 경우
            if (friendList[0] == null) {
                const result = new Object();
                result.success = true;
                result.data = '';
                result.message = '가져올 친구 차단 목록이 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 친구 차단 목록을 그대로 리턴
                const result = new Object();
                result.success = true;
                result.data = friendList;
                result.message = '친구 차단 목록을 성공적으로 가져왔습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            }
        }).catch(error => {
            // 친구 차단 목록 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 목록 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '친구 차단 목록 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 모든 친구 차단 목록 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 거절
router.patch('/rejection/:friend_id', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;
        const user_nickname = req.user.nickname;
        const friend_id = req.params.friend_id;
        const friend_uid = req.body.friend_uid;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 거절 Request`);
        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] friend_id : ${friend_id}, friend_uid : ${friend_uid}`);

        // 본인을 친구 거절 시 에러 출력
        if (friend_uid == user_uid) {
            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '나 자신을 거절할 수 없습니다. 나 자신은 인생의 영원한 친구입니다.';
            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(200).send(result);
        }

        // 사용자 테이블에서 이메일로 사용자 검색
        // SELECT user_uid, email, nickname, portrait, introduction FROM users WHERE email=:email;
        await User.findOne({
            attributes: ['user_uid', 'email', 'nickname', 'portrait', 'introduction'],
            where: {
                user_uid: friend_uid
            }
        }).then((user) => {
            // 사용자 테이블 조회를 성공한 경우
            if (user == null) {
                // 사용자 테이블에서 사용자 검색에 실패한 경우
                const result = new Object();
                result.success = false;
                result.data = 'NONE';
                result.message = '사용자를 찾을 수 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 사용자 테이블에서 사용자 검색에 성공한 경우
                // 프론트에 돌려줄 검색 데이터 객체 새로 생성
                const searchData = new Object();
                searchData.user_uid = user.user_uid;
                searchData.email = user.email;
                searchData.nickname = user.nickname;
                searchData.portrait = user.portrait;
                searchData.introduction = user.introduction;

                // 친구 테이블에 친구 데이터가 있는지 검색
                // SELECT * FROM friends WHERE id=:friend_id;
                Friend.findOne({
                    where: {
                        id: friend_id
                    }
                }).then((friend) => {
                    // 친구 테이블 조회를 성공한 경우
                    if (friend == null) {
                        // 검색 후 결과 값이 NULL인 경우(친구 테이블에 친구 데이터가 없는 경우) 
                        const result = new Object();
                        result.success = false;
                        result.data = 'NONE';
                        result.message = '친구를 찾을 수 없습니다.';
                        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                        return res.status(200).send(result);
                    } else {
                        // 검색 후 결과 값이 NOT NULL인 경우(친구 테이블에 친구 데이터가 있는 경우)
                        if (friend.type == 1) {
                            // LEFT가 RIGHT에게 친구 요청을 보낸 경우
                            if (friend.user_uid == user_uid) {
                                // 내가 LEFT인 경우
                                //내가 보낸 요청을 거절할 수 없음
                                const result = new Object();
                                result.success = false;
                                result.data = 'NONE';
                                result.message = '내가 보낸 요청을 거절할 수 없습니다.';
                                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                return res.status(200).send(result);
                            } else {
                                // 내가 RIGHT인 경우
                                // 상대방이 보낸 친구 요청을 거절
                                // UPDATE friends SET type=:type WHERE id=:friend_id; 
                                Friend.update({
                                    type: 0
                                }, {
                                    where: {
                                        id: friend_id
                                    }
                                }).then(() => {
                                    // 친구 거절을 성공한 경우
                                    searchData.type = 0;

                                    const result = new Object();
                                    result.success = true;
                                    result.data = searchData;
                                    result.message = user_nickname + '이 ' + searchData.nickname + '의 친구 요청을 거절했습니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }).catch(error => {
                                    // 친구 추가를 실패한 경우
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 거절 실패 \n ${error.stack}`);

                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '친구 거절 과정에서 에러가 발생하였습니다.';
                                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(500).send(result);
                                });
                            }
                        } else {
                            // 친구 요청을 보낸 사용자가 아닌 경우
                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '친구 요청을 보낸 사용자가 아닙니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        }
                    }
                }).catch(error => {
                    // 친구 테이블 조회를 실패한 경우
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 테이블 조회 실패 \n ${error.stack}`);

                    const result = new Object();
                    result.success = false;
                    result.data = 'NONE';
                    result.message = '친구 조회 과정에서 에러가 발생하였습니다.';
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                    return res.status(500).send(result);
                });
            }
        }).catch(error => {
            // 사용자 테이블 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 사용자 테이블 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '사용자 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 친구 거절 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 차단
router.patch('/block/:friend_id', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;
        const user_nickname = req.user.nickname;
        const friend_id = req.params.friend_id;
        const friend_uid = req.body.friend_uid;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 Request`);
        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] friend_id : ${friend_id}, friend_uid : ${friend_uid}`);

        // 본인 이메일 차단 시 에러 출력
        if (user_uid == friend_uid) {
            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '스스로를 차단할 수 없습니다. 나 자신은 인생의 영원한 친구입니다.';
            console.log(result);
            return res.status(200).send(result);
        }

        // 사용자 테이블에서 uid로 사용자 검색
        // SELECT user_uid, email, nickname, portrait, introduction FROM users WHERE user_uid=:friend_uid;
        await User.findOne({
            attributes: ['user_uid', 'email', 'nickname', 'portrait', 'introduction'],
            where: {
                user_uid: friend_uid
            }
        }).then((user) => {
            // 사용자 테이블 조회를 성공한 경우
            if (user == null) {
                // 사용자 테이블에서 사용자 검색에 실패한 경우
                const result = new Object();
                result.success = false;
                result.data = 'NONE';
                result.message = '사용자를 찾을 수 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 사용자 테이블에서 사용자 검색에 성공한 경우
                // 프론트에 돌려줄 검색 데이터 객체 새로 생성
                const searchData = new Object();
                searchData.user_uid = user.user_uid;
                searchData.email = user.email;
                searchData.nickname = user.nickname;
                searchData.portrait = user.portrait;
                searchData.introduction = user.introduction;

                // 친구 테이블에 친구 데이터가 있는지 검색
                // SELECT * FROM friends WHERE id=:friend_id;
                Friend.findOne({
                    where: {
                        id: friend_id
                    }
                }).then((friend) => {
                    // 친구 테이블 조회를 성공한 경우
                    if (friend == null) {
                        // 검색 후 결과 값이 NULL인 경우(친구 테이블에 친구 데이터가 없는 경우) 
                        const result = new Object();
                        result.success = false;
                        result.data = 'NONE';
                        result.message = '친구를 찾을 수 없습니다.';
                        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                        return res.status(200).send(result);
                    } else {
                        // 검색 후 결과 값이 NOT NULL인 경우(친구 테이블에 친구 데이터가 있는 경우)
                        // 친구 관계에 따라 수정 내용 변경
                        if (friend.type == 5) {
                            // 이미 서로 차단한 상태인 경우
                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '이미 차단한 사용자입니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else {
                            /* 
                            1 -> LEFT 혹은 RIGHT가 친구 요청을 한 경우
                            2 -> LEFT와 RIGHT가 서로 친구인 경우
                            3 -> LEFT가 RIGHT를 차단한 경우
                            4 -> RIGHT가 LEFT를 차단한 경우
                            */
                            const updateInfo = new Object();
                            if (friend.user_uid == user_uid) {
                                updateInfo.position = 'LEFT';
                            } else {
                                updateInfo.position = 'RIGHT';
                            }

                            if (friend.type == 0 | friend.type == 1) {
                                // 한 쪽에서 친구 요청을 한 상태인 경우
                                const result = new Object();
                                result.success = false;
                                result.data = 'NONE';
                                result.message = '친구가 아니므로 차단할 수 없습니다.';
                                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                return res.status(200).send(result);
                            } else if (friend.type == 2) {
                                // 친구 상태인 경우
                                if (updateInfo.position == 'LEFT') {
                                    updateInfo.type = 3;
                                } else {
                                    updateInfo.type = 4;
                                }
                            } else if (friend.type == 3) {
                                // LEFT가 RIGHT를 차단한 경우

                                if (updateInfo.position == 'LEFT') {
                                    // 이미 차단한 상태이므로 에러 처리
                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '이미 차단한 사용자입니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);;
                                    return res.status(200).send(result);
                                } else {
                                    updateInfo.type = 5;
                                }
                            } else if (friend.type == 4) {
                                // RIGHT가 LEFT를 차단한 경우

                                if (updateInfo.position == 'LEFT') {
                                    updateInfo.type = 5;
                                } else {
                                    // 이미 차단한 상태이므로 에러 처리
                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '이미 차단한 사용자입니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }
                            }
                            // UPDATE friends SET type=:type WHERE id=:friend_id; 
                            Friend.update({
                                type: updateInfo.type
                            }, {
                                where: {
                                    id: friend_id
                                }
                            }).then(() => {
                                // 친구 차단을 성공한 경우
                                searchData.type = updateInfo.type;

                                const result = new Object();
                                result.success = true;
                                result.data = searchData;
                                result.message = '성공적으로 ' + user_nickname + '이 ' + searchData.nickname + '을 차단하였습니다.';
                                console.log(result);
                                return res.status(200).send(result);
                            }).catch(error => {
                                // 친구 차단을 실패한 경우
                                winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 실패 \n ${error.stack}`);

                                const result = new Object();
                                result.success = false;
                                result.data = 'NONE';
                                result.message = '친구 차단 과정에서 에러가 발생하였습니다.';
                                winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                console.log(result);
                                return res.status(500).send(result);
                            });
                        }
                    }
                }).catch(error => {
                    // 친구 테이블 조회를 실패한 경우
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 테이블 조회 실패 \n ${error.stack}`);

                    const result = new Object();
                    result.success = false;
                    result.data = 'NONE';
                    result.message = '친구 조회 과정에서 에러가 발생하였습니다.';
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                    console.log(result);
                    return res.status(500).send(result);
                });
            }
        }).catch(error => {
            // 사용자 테이블 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 사용자 테이블 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '사용자 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 친구 차단 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

// 친구 차단 해제
router.patch('/unblock/:friend_id', clientIp, isLoggedIn, async function (req, res, next) {
    try {
        const user_uid = req.user.user_uid;
        const user_email = req.user.email;
        const user_nickname = req.user.nickname;
        const friend_id = req.params.friend_id;
        const friend_uid = req.body.friend_uid;

        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 해제 Request`);
        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] friend_id : ${friend_id}, friend_uid : ${friend_uid}`);

        // 본인 차단 해제 시 에러 출력
        if (user_uid == friend_uid) {
            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '스스로를 차단 해제할 수 없습니다. 나 자신은 인생의 영원한 친구입니다.';
            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(200).send(result);
        }

        // 사용자 테이블에서 이메일로 사용자 검색
        // SELECT user_uid, email, nickname, portrait, introduction FROM users WHERE email=:email;
        await User.findOne({
            attributes: ['user_uid', 'email', 'nickname', 'portrait', 'introduction'],
            where: {
                user_uid: friend_uid
            }
        }).then((user) => {
            // 사용자 테이블 조회를 성공한 경우
            if (user == null) {
                // 사용자 테이블에서 사용자 검색에 실패한 경우
                const result = new Object();
                result.success = false;
                result.data = 'NONE';
                result.message = '사용자를 찾을 수 없습니다.';
                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                return res.status(200).send(result);
            } else {
                // 사용자 테이블에서 사용자 검색에 성공한 경우
                // 프론트에 돌려줄 검색 데이터 객체 새로 생성
                const searchData = new Object();
                searchData.user_uid = user.user_uid;
                searchData.email = user.email;
                searchData.nickname = user.nickname;
                searchData.portrait = user.portrait;
                searchData.introduction = user.introduction;

                // 친구 테이블에 친구 데이터가 있는지 검색
                // SELECT * FROM friends WHERE id=:friend_id;
                Friend.findOne({
                    where: {
                        id: friend_id
                    }
                }).then((friend) => {
                    // 친구 테이블 조회를 성공한 경우
                    if (friend == null) {
                        // 검색 후 결과 값이 NULL인 경우(친구 테이블에 친구 데이터가 없는 경우) 
                        const result = new Object();
                        result.success = false;
                        result.data = 'NONE';
                        result.message = '친구를 찾을 수 없습니다.';
                        winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                        return res.status(200).send(result);
                    } else {
                        // 검색 후 결과 값이 NOT NULL인 경우(친구 테이블에 친구 데이터가 있는 경우)
                        // 친구 관계에 따라 수정 내용 변경
                        if (friend.type == 0 | friend.type == 1) {
                            // 친구 요청 상태인 경우
                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '친구가 아니므로 차단 해제할 수 없습니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else if (friend.type == 2) {
                            // 친구 상태인 경우
                            const result = new Object();
                            result.success = false;
                            result.data = 'NONE';
                            result.message = '아직 차단하지 않은 친구입니다.';
                            winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                            return res.status(200).send(result);
                        } else {
                            /* 
                            3 -> LEFT가 RIGHT를 차단한 경우
                            4 -> RIGHT가 LEFT를 차단한 경우
                            5 -> LEFT와 RIGHT가 서로 차단한 경우
                            */
                            const updateInfo = new Object();
                            if (friend.user_uid == user_uid) {
                                updateInfo.position = 'LEFT';
                            } else {
                                updateInfo.position = 'RIGHT';
                            }

                            if (friend.type == 3) {
                                // LEFT가 RIGHT를 차단한 경우
                                if (updateInfo.position == 'LEFT') {
                                    updateInfo.type = 2;
                                } else {
                                    // 나는 차단한 적이 없으므로 차단 해제 에러 처리
                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '아직 차단하지 않은 친구입니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                }
                            } else if (friend.type == 4) {
                                // RIGHT가 LEFT를 차단한 경우
                                if (updateInfo.position == 'LEFT') {
                                    // 나는 차단한 적이 없으므로 차단 해제 에러 처리
                                    const result = new Object();
                                    result.success = false;
                                    result.data = 'NONE';
                                    result.message = '아직 차단하지 않은 친구입니다.';
                                    winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                    return res.status(200).send(result);
                                } else {
                                    updateInfo.type = 2;
                                }
                            } else if (friend.type == 5) {
                                // LEFT와 RIGHT가 서로 차단한 경우
                                if (updateInfo.position == 'LEFT') {
                                    // LEFT가 차단을 해제해도 RIGHT의 차단이 남아있음
                                    updateInfo.type = 4;
                                } else {
                                    // RIGHT가 차단을 해제해도 LEFT의 차단이 남아있음
                                    updateInfo.type = 3;
                                }
                            }
                            // UPDATE friends SET type=:type WHERE id=:friend_id; 
                            Friend.update({
                                type: updateInfo.type
                            }, {
                                where: {
                                    id: friend_id
                                }
                            }).then(() => {
                                // 친구 차단 해제를 성공한 경우
                                searchData.type = updateInfo.type;

                                const result = new Object();
                                result.success = true;
                                result.data = searchData;
                                result.message = '성공적으로 ' + user_nickname + '이 ' + searchData.nickname + '의 차단을 해제하였습니다.';
                                winston.log('info', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                return res.status(200).send(result);
                            }).catch(error => {
                                // 친구 차단 해제를 실패한 경우
                                winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 차단 해제 실패 \n ${error.stack}`);

                                const result = new Object();
                                result.success = false;
                                result.data = 'NONE';
                                result.message = '친구 차단 해제 과정에서 에러가 발생하였습니다.';
                                winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                                console.log(result);
                                return res.status(500).send(result);
                            });
                        }
                    }
                }).catch(error => {
                    // 친구 테이블 조회를 실패한 경우
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 친구 테이블 조회 실패 \n ${error.stack}`);

                    const result = new Object();
                    result.success = false;
                    result.data = 'NONE';
                    result.message = '친구 조회 과정에서 에러가 발생하였습니다.';
                    winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
                    return res.status(500).send(result);
                });
            }
        }).catch(error => {
            // 사용자 테이블 조회를 실패한 경우
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] 사용자 테이블 조회 실패 \n ${error.stack}`);

            const result = new Object();
            result.success = false;
            result.data = 'NONE';
            result.message = '사용자 조회 과정에서 에러가 발생하였습니다.';
            winston.log('error', `[FRIEND][${req.clientIp}|${user_email}] ${result.message}`);
            return res.status(500).send(result);
        });
    } catch (e) {
        winston.log('error', `[FRIEND][${req.clientIp}|${req.user.email}] 친구 차단 해제 Exception`);

        const result = new Object();
        result.success = false;
        result.data = 'NONE';
        result.message = 'INTERNAL SERVER ERROR';
        winston.log('error', `[FRIEND][${req.clientIp}|${req.body.email}] ${result.message}`);
        res.status(500).send(result);
        return next(e);
    }
});

module.exports = router;
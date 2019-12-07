const express = require('express');
const { Board } = require('../../models');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares'); 
const router = express.Router();


router.post('/create', isLoggedIn, async (req, res, next) => {
    try{
        const { feedback_id, board_title, board_content } = req.body;
        console.log('피드백 생성', feedback_id, board_title, board_content);

        const exBoard = await Board.create({
            board_title,
            board_content,
            fk_feedbackId: feedback_id,
        });
        let result = {
            success: true,
            data: '',
            message: '게시글 생성 완료',
        }
        if(exBoard) {
            result.data= exBoard
            res.status(201).json(result);
        }else {
            result.success = false;
            result.message = '게시글이 생성되지 않았습니다.';
            return res.status(201).json(result);
        }

    } catch(e){
        let result = {
            success: false,
            data: '',
            message: e
        }
        res.status(500).json(result);
        console.error(e);
        return next(e);
    }
});

router.put('/update/:board_id', isLoggedIn, async (req, res, next) => {
    try{
        const board_id = req.params.board_id;
        const { board_title, board_content } = req.body; 
        console.log('board text put 요청', board_title, board_content);
        const beforeBoard = await Board.findOne({
            where: {id:board_id},
        });
        let tempBoard = new Object();
        if(board_title || board_title !== beforeBoard.board_title){
            tempBoard.board_title = await board_title;
        }else{tempBoard.board_title = await beforeBoard.board_title;}

        if(board_content || board_content !== beforeBoard.board_content){
            tempBoard.board_content = await board_content;
        }else{tempBoard.board_content = await beforeBoard.board_content;}

        //업데이트
        const update = await Board.update({
            board_title:tempBoard.board_title, board_content:tempBoard.board_content
        }, {where: {id:board_id}})
        // console.log(update);
        //response
        const data = await Board.findOne({where:{id:board_id}})
        let result = {
            success: true,
            data,
            message: 'board text update 성공'
        }
        res.status(203).json(result);
    } catch(e){
        let result = {
            success: false,
            data: '',
            message: e
        }
        res.status(500).json(result);
        console.error(e);
        return next(e);
    }
});

router.patch('/board_title/:board_id', isLoggedIn, async (req, res, next) => {
    try{
        const board_id = req.params.board_id;
        const { board_title } = req.body; 
        console.log('board board_title 수정', board_title);
        const update = await Board.update({
            board_title
        }, {where: {id:board_id}})
        const data = await Board.findOne({where:{id:board_id}})
        let result = {
            success: true,
            data,
            message: 'board update 성공'
        }
        res.status(203).json(result);
    } catch(e){
        let result = {
            success: false,
            data: '',
            message: e
        }
        res.status(500).json(result);
        console.error(e);
        return next(e);
    }
});

router.patch('/board_content/:board_id', isLoggedIn, async (req, res, next) => {
    try{
        const board_id = req.params.board_id;
        const { board_content } = req.body; 
        console.log('board board_content 수정', board_content);
        const update = await Board.update({
            board_content
        }, {where: {id:board_id}})
        const data = await Board.findOne({where:{id:board_id}})
        let result = {
            success: true,
            data,
            message: 'board update 성공'
        }
        res.status(203).json(result);
    } catch(e){
        let result = {
            success: false,
            data: '',
            message: e
        }
        res.status(500).json(result);
        console.error(e);
        return next(e);
    }
});

router.delete('/:board_id', isLoggedIn, async (req, res, next) => {
    try{
        const board_id = req.params.board_id;
        console.log('board 삭제', board_id);
        await Board.destroy({where: {id:board_id}});
        let result = {
            success: true,
            data: '',
            message: 'Board delete 성공'
        }
        res.status(204).json(result);
    } catch(e){
        let result = {
            success: false,
            data: '',
            message: e
        }
        res.status(500).json(result);
        console.error(e);
        return next(e);
    }
});

module.exports = router;
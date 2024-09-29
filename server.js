const express = require("express");
const app = express();
const port = 83;
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');

app.set('view engine', 'ejs');

// form submit을 post로 받기 위한 설정
app.use(express.urlencoded({ extended: true }));

// MySQL 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 사용자 이름
    password: '20240429aimoon', // MySQL 비밀번호
    database: 'board', // 사용할 데이터베이스 이름
    port: 3306,
});

// MySQL 연결
connection.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공');
});

// express-session 설정
app.use(session({
    secret: '123456', // 세션 암호화에 사용되는 키
    resave: false, // 세션이 수정되지 않아도 다시 저장할지 여부
    saveUninitialized: false, // 초기화되지 않은 세션을 저장할지 여부
    cookie: { maxAge: 1000 * 3600 } // 쿠키의 유효 기간 설정 (밀리초 단위)
}));

app.get('/', (req, res) => {
    connection.query(`SELECT 
        no, title, reg_user_id, user.nickname, DATE_FORMAT(reg_dt, '%Y-%m-%d %H:%i:%s') as regdt 
        FROM post 
        JOIN user ON user.id = post.reg_user_id
        ORDER BY no DESC`,
        function (err, posts) {
            if(err){
                console.error('데이터 베이스 오류:', arr);
                return res.status(500).send('서버 오류');    
            }
            res.render('index', { posts, user: req.session.user });
        });
});

app.get('/join', function (req, res) {
    res.render('join', {});
})

// 회원 등록
app.post('/join', async (req, res) => {
    const newData = req.body;
    const hashedPassword = await bcrypt.hash(req.body.pw, 10);

    const sql = 'INSERT INTO `board`.`user` \
    (`id`, `pw`, `nickname`, `email`, `level`) VALUES (?, ?, ?, ?, 1)';
    const values = [newData.id, hashedPassword, newData.nickname, newData.email];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('데이터베이스 오류:', err);
            return res.status(500).send('서버 오류');
        }

        const resultHtml = `<script>
        alert('회원 등록이 완료되었습니다.');
        location.href = '/'; </script>`;
        res.send(resultHtml);
    });
});

// 로그인 페이지
app.get('/login', function (req, res) {
    res.render('login');
})

// 로그인 세션 처리
app.post('/login', function (req, res) {
    // 1. id에 해당하는 유저 정보를 db에서 꺼냄
    connection.query(`SELECT * FROM user WHERE id = ?`, [req.body.id], function (err, user) {
        // DB쿼리 에러나면
        if (err) {
            console.error('데이터베이스 오류:', err);
            return res.status(403).send('서버 오류');
        }

        // 없는 정보라면
        if (!user || user.length == 0) {
            return res.status(403)
                .send(`<script>alert('사용자 정보를 찾을 수 없습니다.'); location.href='/login';</script>`);
        }
        user = user[0];

        // 2. 로그인pw, 유저 정보의 hash되어 있는 pw 검증
        if (bcrypt.compareSync(req.body.pw, user.pw)) {
            // 3. 정보가 확인되면(인증 성공) 세션 발급
            req.session.user = user;
            res.redirect('/'); // 메인 화면으로 보냄
        } else {
            // 인증실패, 로그인화면 다시 redirect
            return res.status(403)
                .send(`<script>alert('사용자 정보를 찾을 수 없습니다.'); location.href='/login';</script>`);
        }
    })
})

// 로그아웃
app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/'); // 세션 삭제가 완료되면 메인화면으로 이동
    });
});

// 글 작성 페이지
app.get('/form', function (req, res) {
    if(req.session.user){
        res.render('form');    
    } else{
        res.redirect('/login');
    }
});

// 글 등록 처리
app.post('/post', function (req, res) {
    const post = req.body;
    const sql = 'INSERT INTO `board`.`post` \
    (`subject`, `title`, `content`, `reg_dt`, `reg_user_id`) VALUES (?, ?, ?, now(), ?)';
    const values = [post.subject, post.title, post.content, req.session.user.id];

    connection.query(sql, values, (err, result) => {
        if(err){
            console.error('데이터베이스 오류:', err);
            return res.status(500).send('서버오류');
        }
        const resultHtml = `<script>
        alert('게시글 등록이 완료되었습니다.');
        location.href = '/'; </script>`;
        res.send(resultHtml);
    });
});

// 글 삭제 처리
app.post('/delete', function(req, res) {
    const userid = req.session.user.id;
    connection.query(`DELETE FROM post WHERE no = ? AND reg_user_id = ?`, 
        [req.body.no, userid], function(err, result) {
        
        res.redirect('/');
    })
})

// 글 상세조회
app.get('/posts/:no', function(req, res) {
    const no = req.params.no;
    console.log(no);
    connection.query(`SELECT * FROM post WHERE no = ?`, [no], function(err, post){
        if(err){
            console.error('데이터베이스 오류:', err);
        }
        res.render('detail', {post:post[0]});
    });
});

app.listen(port, () => {
    console.log(`서버 실행중: http://localhost:${port}`);
});
var express = require('express');
var router = express.Router();
var session = require('express-session');
var mysql = require('mysql');
var conn = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  password : '',
  database : 'bookstore2'
})

conn.connect();

var date = new Date();
var dd = date.getDate();
var mm = date.getMonth() + 1;
var yyyy = date.getFullYear();
var date = yyyy + '-' + mm + '-' + dd;

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@회원가입@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/sign_up', function(req, res, next) {
  var body = req.body
  var sql = "insert into clients (id,password,name) values (?,?,?)"
  var sql1 = "insert into basket (id, makeDate) values ( ?, ?)"
  conn.query(sql,[body.id, body.password, body.name], function(err, row){
    if (err) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('중복된 아이디 입니다..'); history.back(); </script>");
    }
    else {
      conn.query(sql1, [body.id, date])
      res.redirect("/login");
    }
  });
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@로그인@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post("/login", async function(req,res,next){
  var body = req.body;
  var sess = req.session;
  // var loginsql = `select * from clients where id = '${body.id}' AND password = '${body.pw}'`;
  var loginsql = `select * from clients where id = ? AND password = ?`;

  conn.query(loginsql,[body.id,body.pw],function(err,row){
  
    if(err){
      throw err;
    }
    else{
      if (row[0]==null) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('아이디 또는 비밀번호를 잘못 입력하였습니다.'); history.back(); </script>");
      }
      else  {
        sess.userid = row[0].id;
        sess.userpw = row[0].password;
        sess.username = row[0].name;
        res.redirect('/');
      }
    }
  });
  
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@마이페이지@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/mypage', function(req, res, next) {
  var body = req.body;
  var val = req.session;
  val.discount = 1;
  var myinfo = {}
  var sql = "SELECT * FROM card WHERE id = ?"
  var sql2 = "SELECT * FROM address, shippingdetail WHERE address.AddressNum = shippingdetail.AddressNum and id = ?"
  var sql3 = "SELECT LAST_INSERT_ID() as OrderNum"
  var sql4 = "SELECT orders.orderDate as orderDate, concat(orders.PriAddress,' ', orders.DetAddress) AS Address, book.BookName AS BookName," + 
  "orderinfo.Count AS Count, (book.price * orderinfo.Count)   AS orderSum FROM orders, orderinfo, book WHERE orders.OrderNum = orderinfo.OrderNum AND " +
  "orderinfo.BookNum = book.BookNum AND orders.id = ? ORDER BY orders.orderDate DESC"
  var clientsql = "SELECT * FROM clients WHERE id = ?"

  conn.query(sql, [val.userid], (err, cardDetail) => {
    myinfo.card = cardDetail;
    conn.query(sql2, [val.userid], (err, addressDetail) => {      
      myinfo.address = addressDetail;
        conn.query(sql3, function(err, row3) {
          conn.query(sql4, [val.userid], function(err, row) {
            conn.query(clientsql, [val.userid], function(err, total){
            myinfo.searchorders = row;
            myinfo.totalprice=total;
              if(val.userid != null) {
                var ratingsql = "UPDATE clients SET ID = ID"
                if(total[0].totalprice <= 50000){
                  ratingsql += ", rating = 'bronze'"
                  val.discount = 1
                }
                if(total[0].totalprice > 50000 && total[0].totalprice <= 150000){
                  ratingsql += ", rating = 'silver'"
                  val.discount = 0.97
                }
                if(total[0].totalprice > 150000 && total[0].totalprice <= 3000000){
                  ratingsql += ", rating = 'gold'"
                  val.discount = 0.95
                }
                if(total[0].totalprice > 300000){
                  ratingsql += ", rating = 'VIP'"
                  val.discount = 0.90
                }
                ratingsql += "WHERE ID = ?";
                conn.query(ratingsql, [val.userid], function(err, rating) {
                  conn.query(clientsql, [val.userid], function(err, total){
                    console.log('확인', total);
                    res.render('mypage', {user : val, title: 'Express', UName:val.username, card:cardDetail, address:addressDetail, searchorders:row, totalprice:total});
                  })
                })
              }
            });
          });
        });
      });
    });
  });

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@카드추가@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/mypage/card', function(req, res, next) {
  var { CardNum, Validity, Kinds } = req.body
  var { userid } = req.session
  var sql = "insert INTO card (CardNum, id, Validity, Kinds) values (?,?,?,?)"
    if(CardNum == "" || Kinds == "" || Validity == ""){
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('잘못된 정보입니다.'); history.back(); </script>");
    }
    else {
      conn.query(sql,[CardNum, userid, Validity, Kinds], function(err, row){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('카드 정보가 등록되었습니다!'); location.href='/mypage'; </script>");
    });
    }
  

});
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@카드삭제@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/delete/:CardNum', function(req, res, next) {
  var CardNum = req.params.CardNum
  var val = req.session;
  var sql = "delete from card where CardNum = ?";
  conn.query(sql, [CardNum], function(err, row){
    if (err){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('실패하였습니다.'); history.back(); </script>");
    }
    else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('카드 정보가 삭제되었습니다!'); location.href='/mypage'; </script>");
    }
  })
});


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@배송지추가@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/mypage/address', function(req, res, next) {
  var { Zipcode, PriAddress, DetAddress, } = req.body
  var { userid } = req.session
  var sess = req.session;
  var sql = "INSERT INTO `address`(`Zipcode`, `PriAddress`, `DetAddress`) VALUES (?,?,?)"
  conn.query(sql,[Zipcode, PriAddress, DetAddress], function(err, row){
    var sql2 = "select LAST_INSERT_ID() as addressIndex"
    conn.query(sql2, function(err, row1) {
      var sql3 = "INSERT INTO shippingdetail(id, AddressNum) VALUES(?, ?)"
      if(Zipcode == "" || PriAddress == "" || DetAddress == ""){
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('잘못된 정보입니다.'); history.back(); </script>");
      }
      else {
                conn.query(sql3, [sess.userid, row1[0].addressIndex], function(err, row2) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('주소가 등록되었습니다!'); location.href='/mypage'; </script>");
      });
      }
    });
  });
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@배송지삭제@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/delete1/:AddressNum', function(req, res, next) {
  var AddressNum = req.params.AddressNum
  var { Zipcode, PriAddress, DetAddress } = req.body
  var val = req.session;
  var sql = "delete from address where AddressNum = ?";
  conn.query(sql, [AddressNum], function(err, row){
    if (err){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('실패하였습니다.'); history.back(); </script>");
    }
    else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('배송지 정보가 삭제되었습니다!'); location.href='/mypage'; </script>");
    }
  })
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@도서추가@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/add', function(req, res, next) {
  var {BookName, publish, stock, BookInfo, price, bookAmount} = req.body
  var sql = "INSERT INTO `book`( `BookName`, `publish`, `stock`, `BookInfo`, `price`, `bookAmount`) VALUES (?, ?, ?, ?, ?, ?)"
  conn.query(sql,[BookName, publish, stock, BookInfo, price, bookAmount], function(err, row){
      if (err) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
          res.write("<script> alert('잘못된 정보입니다.'); history.back(); </script>");
      }
      else {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('도서 정보가 등록되었습니다!'); location.href='/list'; </script>");
      }
      
    }); 
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@도서삭제@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/delete2/:BookNum', function(req, res, next) {
  var BookNum = req.params.BookNum
  var val = req.session;
  var sql = "delete from book where BookNum = ?";
  conn.query(sql, [BookNum], function(err, row){
    if (err){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('실패하였습니다.'); history.back(); </script>");
    }
    else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('도서가 삭제되었습니다!'); location.href='/list'; </script>");
    }
  })
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@도서수정@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/update/:BookNum', function(req, res, next) {
  var BookNum = req.params.BookNum;
  var val = req.session;
  var myinfo = {}
  var sql = "SELECT * FROM book WHERE BookNum = ?";
  conn.query(sql, [BookNum], function(err, row){
    myinfo.bookupdate=row;
      res.render('bookupdate', {user : val, bookupdate:row});
    })
});

router.post('/update/:BookNum', function(req, res, next){
  var BookNum = req.params.BookNum;
  var {BookName, publish, stock, BookInfo, price, bookAmount} = req.body
  var sql = "UPDATE book SET BookName = ?, BookInfo = ?, price = ?, stock = ?, publish = ?, bookAmount = ? WHERE BookNum = ?"
  conn.query(sql,[BookName, BookInfo, price, stock, publish, bookAmount, BookNum], function(err, row){
    
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
    res.write("<script> alert('도서 정보가 수정되었습니다!'); location.href='/list'; </script>");
  })
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@리스트@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/list', function(req, res, next) {
  var val = req.session;
  var myinfo = {}
  var sql = "SELECT * FROM book"
  conn.query(sql, (err, bookDetail) => {
    myinfo.book = bookDetail; 
      res.render('list', {user : val, title: 'Express', book:bookDetail});
    })
  });
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@리스트검색@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
  router.post('/list', function(req, res, next) {
    var val = req.session;
    var searchItem = req.body.searchItem;
    var myinfo = {}
    var sql = `SELECT * FROM book WHERE BookName LIKE '%${searchItem}%'`
    conn.query(sql, (err, bookDetail) => {
      myinfo.book = bookDetail;
      res.render('list', {user : val, title: 'Express', book:bookDetail});
      })
    });
  
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@도서상세정보@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
  router.get('/bookInfo/:BookNum', function(req, res, next) {
    var val = req.session;
    var myinfo = {}
    var sql = "SELECT * FROM book WHERE BookNum = ?"
    conn.query(sql,[req.params.BookNum], (err, bookDetail) => {
      myinfo.book = bookDetail;
    res.render('bookInfo', {user : val, title: 'Express', book:bookDetail });
  });
  });

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@장바구니 담기@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/bookinfo/:BookNum', function(req, res, next) {
  var val = req.session;
  var params = req.params;
  val.bookSum = req.body.count;
  var sql = "select * from basket where id = ?"
  var sql1 = "insert INTO basketdetail (basketNum, BookNum, count) values (?, ?, ?)"
  var sql2 = "UPDATE basketdetail SET count = count + ? WHERE BookNum = ? and basketNum = ?"
  // UPDATE book SET bookAmount = (bookAmount - ?) WHERE BookNum = ?
  if(req.body.basket != null){
    conn.query(sql,[val.userid], function(err, bookDetail)  {
      if(err){
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('실패하였습니다.'); history.back(); </script>");
      }
      else{
      
        
        conn.query(sql1,[bookDetail[0].basketNum, params.BookNum, req.body.count], function(err, bookDetail1)  {
          if(err){
                    conn.query(sql2, [req.body.count, params.BookNum, bookDetail[0].basketNum], function(err, row) {
                      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
                      res.write("<script> alert('장바구니에 추가하였습니다.'); location.href='/basket' </script>");
                    })
            }else{
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
              res.write("<script> alert('장바구니에 추가하였습니다.'); location.href='/basket' </script>");
            }
          });
        }
      });
    } else{
      res.redirect("/orders/" + params.BookNum)
  }
})

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@장바구니 리스트@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/basket', function(req, res, next) {
  var val = req.session;
  var myinfo = {}
  var sql = "SELECT * FROM basket, basketdetail, book WHERE basket.id = ? and basket.basketNum = basketdetail.basketNum and basketdetail.BookNum = book.BookNum"
  var sql1 = "SELECT * FROM card WHERE id = ?"
  var sql2 = "SELECT * FROM  address, shippingdetail WHERE address.AddressNum = shippingdetail.AddressNum AND id = ?"
  conn.query(sql,[req.session.userid], (err, bookDetail) => {
    myinfo.book = bookDetail;
    conn.query(sql1, [val.userid], function(err, row1){
      conn.query(sql2, [val.userid], function(err, row2){
        res.render('basket', {user : val, title: 'Express', book:bookDetail,  card:row1, address:row2});
      })
});
});
})

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@장바구니삭제@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/delete3/:BookNum', function(req, res, next) {
  var BookNum = req.params.BookNum
  var val = req.session;
  var sql = "delete from basketdetail where BookNum = ?";
  conn.query(sql, [BookNum], function(err, row){
    if (err){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
        res.write("<script> alert('실패하였습니다.'); history.back(); </script>");
    }
    else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
      res.write("<script> alert('도서가 삭제되었습니다!'); location.href='/basket'; </script>");
    }
  })
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@장바구니주문@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/basket', function(req, res, next) {
  var val = req.session;
  var id = val.userid;
  var body = req.body;
  var params = req.params;
  var myinfo = {}
  var orderSum = body.totalPrice;
  var Count = val.bookSum;
  

  var cardsql = "SELECT * FROM card WHERE id = ?"
  var addresssql = "SELECT * FROM address, shippingdetail WHERE shippingdetail.id =? AND address.AddressNum = shippingdetail.AddressNum AND address.AddressNum = ?"
  var basketsql = "SELECT * FROM basket, basketdetail WHERE basket.id = ? AND basket.basketNum = basketdetail.basketNum"
  var sql = "SELECT OrderNum from orders order BY OrderNum desc limit 1"
  // var sql = "SELECT LAST_INSERT_ID() as OrderNum"
  var ordersql = "INSERT INTO orders (id, orderDate, orderSum, Kinds, CardNum, Validity, Zipcode, PriAddress, DetAddress) SELECT  ?" + 
  " AS id, SYSDATE() AS orderDate, SUM(book.price * basketdetail.count) AS orderSum, ? AS Kinds,  ? AS CardNum, ?" + 
  " AS Validity,  ? AS Zipcode,  ? AS PriAddress,  ? AS DetAddress  FROM basketdetail , book WHERE basketdetail.BookNum = book.BookNum AND basketdetail.basketNum = ?"
  var deletesql = "DELETE FROM basketdetail WHERE basketNum = ?"
  var orderinfosql = "INSERT INTO orderinfo (OrderNum, BookNum, Count) VALUES (?, ?, ?)"
  var booksql = "UPDATE book SET bookAmount = (bookAmount - ?) WHERE BookNum = ?"
  var totalpricesql = "UPDATE clients SET totalprice = (SELECT SUM(orderSum) FROM orders WHERE ID = ?) WHERE ID = ?"
  conn.query(cardsql, [val.userid], function(err, row) {
    conn.query(addresssql, [val.userid, body.address], function(err, row1) {
      conn.query(basketsql, [id], function(err, row2) {
        conn.query(ordersql, [id, row[0].Kinds, row[0].CardNum, row[0].Validity, row1[0].Zipcode, row1[0].PriAddress, row1[0].DetAddress, row2[0].basketNum], function(err, row5) {
          conn.query(sql, function(err, row4) {
            conn.query(deletesql, [row2[0].basketNum], function(err, row6) {
              for(var i = 0; i< row2.length; i++) {
                conn.query(orderinfosql, [row4[0].OrderNum, row2[i].BookNum, row2[i].count], function(err, row7) {
                })
                conn.query(booksql, [row2[i].count, row2[i].BookNum], function(err, row8) {
                })
              }
                          conn.query(totalpricesql, [val.userid, val.userid], function(err, row9) {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
              res.write("<script> alert('결제가 완료되었습니다!.'); location.href='/mypage'; </script>");
              })
            })
          })
        })
      })
    })
  })
});
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@바로주문 조회@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.get('/orders/:BookNum', function(req, res, next){
  var val = req.session;
  var params = req.params;
  var sql = "SELECT * FROM  book WHERE BookNum = ?"
  var sql1 = "SELECT * FROM card WHERE id = ?"
  var sql2 = "SELECT * FROM  address, shippingdetail WHERE address.AddressNum = shippingdetail.AddressNum AND id = ?"
  conn.query(sql, [params.BookNum], function(err, row){
    conn.query(sql1, [val.userid], function(err, row1){
      conn.query(sql2, [val.userid], function(err, row2){
        res.render('orders', {user : val, book:row, card:row1, address:row2, title: 'Express' });
      }) 
    })
  })
});

// router.get('/orders/:BookNum', function(req, res, next) {
//   var val = req.session;
//   var params = req.params;
//   var 
// })

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@바로주문@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
router.post('/orders/:BookNum', function(req, res, next) {
  var val = req.session;
  var id = val.userid;
  var body = req.body;
  var params = req.params;
  var myinfo = {}
  var orderSum = body.totalPrice;
  var Count = val.bookSum;
  
  var sql = "SELECT * FROM address, shippingdetail WHERE shippingdetail.id =? and address.AddressNum = shippingdetail.AddressNum and address.AddressNum = ?"
  var sql1 = "SELECT * FROM card WHERE id = ?"
  var sql2 = "INSERT INTO orders ( id, orderDate, orderSum, Kinds, CardNum, Validity, ZipCode, PriAddress, DetADdress) VALUES (?, SYSDATE(), ?, ?, ?, ?, ?, ?, ?)"
  var sql3 = "SELECT OrderNum from orders order BY OrderNum desc limit 1"
  var sql4 = "INSERT INTO orderinfo (OrderNum, BookNum, Count) VALUES (?, ?, ?)"
  var sql5 = "UPDATE book SET bookAmount = (bookAmount - ?) WHERE BookNum = ?";
  var totalpricesql = "UPDATE clients SET totalprice = (SELECT SUM(orderSum) FROM orders WHERE ID = ?) WHERE ID = ?"
  conn.query(sql, [val.userid, body.address], function(err, row){
    conn.query(sql1, [val.userid], function(err, row1){
      conn.query(sql2, [id, orderSum, row1[0].Kinds, row1[0].CardNum, row1[0].Validity, row[0].Zipcode, row[0].PriAddress, row[0].DetAddress], function(err, row3) {
      conn.query(sql3, function(err, row4){
        conn.query(sql4, [row4[0].OrderNum, params.BookNum, Count], function(err, row5) {
            conn.query(sql5, [Count, params.BookNum], function(err, row6){
              conn.query(totalpricesql, [val.userid, val.userid], function(err, row7){
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8;" });
              res.write("<script> alert('결제가 완료되었습니다!.'); location.href='/mypage'; </script>");
            })
            })
          })
        })
      })
    })
  })
});

router.get('/', function(req, res, next) {
  var val = req.session;
  res.render('index', {user : val, title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/Home', function(req, res, next) {
  var val = req.session;
  res.render('Home', {user : val, title: 'Express' });
});

router.get('/sign_up', function(req, res, next) {
  res.render('sign_up');
});

router.get('/add', function(req, res, next) {
  var val = req.session;
  res.render('add', {user : val, title: 'Express' });
});

router.get("/logout", function (req, res, next) { //세션 탈출탈출
  req.session.destroy();
  res.clearCookie('userid');
  res.redirect("/")
});

module.exports = router;
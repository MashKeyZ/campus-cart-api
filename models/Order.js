const pool = require('../db');
const bcrypt = require('bcrypt');
const Uuid = require('./Uuid');
const authenticate = require('../authenticate')

class Order{
    constructor(userId,firstName){
       
        this.userId = userId;
        this.firstName = firstName;
    }

    static async updateOrder(orderStatus,orderId,callback){
        const db= await pool.getConnection();
        try{
                await db.beginTransaction();
                    await db.query(
                        `
                        UPDATE orders
                        SET orderStatus=?
                        WHERE orderId =? 
                        `,
                    [orderStatus,orderId]
                    );
            await db.commit();

            callback(null,orderId);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating order:", err);
            callback("An error occured while updating order:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

  

 static async getMyOrders(userId){
        try {
            const query = `
             SELECT o.*,u.image AS imagePath
             FROM orders o
             JOIN userProfile u ON o.fromUserId = u.userId
             WHERE o.toUserId =?
            `;
        
            const [rows] = await pool.execute(query, [userId]);
            
            return rows;
          } catch (err) {
            throw err;
          }
    }

    static async trackMyOrders(userId){
        try {
            const query = `
             SELECT o.*,u.image AS imagePath
             FROM orders o
             JOIN userProfile u ON o.fromUserId = u.userId
             WHERE o.fromUserId =?
            `;
        
            const [rows] = await pool.execute(query, [userId]);
            
            return rows;
          } catch (err) {
            throw err;
          }
    }

    static async getOrderProducts(orderId){
        console.log('OrderId : '+orderId);
        try {
            const query = `
             SELECT op.orderId,op.quantity,p.productId,p.productName,p.price,p.productRatings,pi.imagePath
             FROM orderProducts op 
             JOIN Products p ON op.productId = p.productId
             LEFT JOIN (
                SELECT productId, MIN(imagePath) AS imagePath
                FROM productImages
                GROUP BY productId
            ) pi ON p.productId = pi.productId
            WHERE op.orderId = ?
             `;
        
            const [rows] = await pool.execute(query, [orderId]);
            
            return rows;
          } catch (err) {
            throw err;
          }
    }

 

    generateOrderNumber() {
        const letters = "ABCGDXYKWDRSZ";
        const letterIndex = Math.floor(Math.random() * letters.length);
        const randomLetter = letters.charAt(letterIndex);
      
        let randomDigits = "";
        for (let i = 0; i < 4; i++) {
          const randomDigit = Math.floor(Math.random() * 10);
          randomDigits += randomDigit;
        }
      
        const orderNumber = '#'+randomLetter + randomDigits;
      
        return orderNumber;
      }

     async createOrder(callback){
 
        const db= await pool.getConnection();
        try{
            const cart = await this.getDistinctUsersCart(this.userId)
            await db.beginTransaction();
            for(let i=0;i<cart.length;i++){
                console.log(cart[i])
                let item = cart[i]
                let orderNumber = this.firstName.split(' ')[0]+this.generateOrderNumber();
                const newCart = await this.getUserCart(this.userId,item)
                let total = 0;
                newCart.forEach(element => {
                   //total +=parseFloat(element.price) * parseFLoat(element.quantity);
                   total +=parseFloat(element.price) * parseFloat(element.quantity)
                });

                //Create order
                await db.query(
                    `
                    INSERT INTO orders(orderId, fromUserId,toUserId,total)
                    VALUES(?,?,?,?)
                    `,
                    [orderNumber,this.userId,item,total]
                    );

                for (const element of newCart) {
                    await db.query(
                        `
                        INSERT INTO orderProducts(productId,orderId,userId,quantity)
                        VALUES(?,?,?,?)
                        `,
                        [element.productId,orderNumber,this.userId,element.quantity]
                        );
                };

            }   
            await db.commit();
            callback(null, 'done');
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while creating order:", err);
            callback("An error occured while creating order:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    async getDistinctUsersCart(userId){
        try {
            const query = `
            SELECT DISTINCT p.userId AS productUserId
            FROM Cart c
            JOIN Products p ON c.productId = p.productId
            WHERE c.userId = ?            
            `;
        
            const [rows] = await pool.execute(query, [userId]);
        
            if (rows.length === 0) {
              return null;
            }
            const cart = rows.map(item=> item.productUserId)
            return cart;
          } catch (err) {
            throw err;
          }
    }

    async getUserCart(userId){
      try {
          const query = `
          SELECT  c.quantity,p.price,p.productId
          FROM Cart c
          JOIN Products p ON c.productId = p.productId
          WHERE c.userId =?            
          `;
      
          const [rows] = await pool.execute(query, [userId]);
      
          if (rows.length === 0) {
            return null;
          }
          //const cart = rows.map(item=> item.productUserId)
          return rows;
        } catch (err) {
          throw err;
        }
  }
   
}

module.exports = Order;
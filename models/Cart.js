const pool = require('../db');
const bcrypt = require('bcrypt');
const Uuid = require('./Uuid');
const authenticate = require('../authenticate')

class Cart{
    constructor(product,userId){
        const {productId,quantity,productUserId} = product;
        this.productId = productId;
        this.userId = userId;
        this.quantity = quantity;
        this.productUserId = productUserId;
    }

    async addToCart(callback){
        const db= await pool.getConnection();
        try{
            if(this.productUserId!==this.userId){
            await db.beginTransaction();
            await db.query(
                        `
                        INSERT INTO Cart(productId,userId,quantity)
                        VALUES(?,?,?)
                        `,
                [this.productId,this.userId,this.quantity]
                );
                
            await db.commit();
            }
            const query2 = `
            SELECT productId
            from Cart
            WHERE userId =?
            `;
        
            const [cart] = await pool.execute(query2, [this.userId]);
            const newCart = cart.map(item=> item.productId)

            callback(null, newCart);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while adding to cart:", err);
            callback("An error occured while adding to cart:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    static async updateQuantity(quantity,productId,productUserId,userId,callback){
        const db= await pool.getConnection();
        try{
            if(productUserId!==userId){
                await db.beginTransaction();
                    await db.query(
                        `
                        UPDATE Cart
                        SET quantity=?
                        WHERE productId =?  AND userId =?
                        `,
                    [quantity,productId,userId]
                    );
            await db.commit();
            }
            const query2 = `
            SELECT productId
            from Cart
            WHERE userId =?
            `;
        
            const [cart] = await pool.execute(query2, [userId]);
            const newCart = cart.map(item=> item.productId)

            callback(null, newCart);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating quantity:", err);
            callback("An error occured while updating quantity:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    static async deleteFromCart(productId,productUserId,userId,callback){
        const db= await pool.getConnection();
        try{
           
            if(productUserId!==userId){
                await db.beginTransaction();
                    await db.query(
                        `
                        DELETE FROM Cart
                        WHERE productId =? AND userId =?
                        `,
                        [productId,userId]
                        );
                await db.commit();
                }
            
            const query2 = `
            SELECT productId
            from Cart
            WHERE userId =?
            `;
        
            const [cart] = await pool.execute(query2, [userId]);
            const newCart = cart.map(item=> item.productId)

            callback(null, newCart);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating quantity:", err);
            callback("An error occured while updating quantity:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    static async getUserCart(userId){
        try {
            const query = `
             SELECT c.*,p.productName,p.userId AS productUserId,p.price,p.productRatings,pi.imagePath
             from Cart c
             JOIN Products p ON c.productId = p.productId
             LEFT JOIN (
                SELECT productId, MIN(imagePath) AS imagePath
                FROM productImages
                GROUP BY productId
             )pi ON p.productId = pi.productId
             WHERE c.userId =?
            `;
        
            const [rows] = await pool.execute(query, [userId]);
        
            if (rows.length === 0) {
              return null;
            }
        
            return rows;
          } catch (err) {
            throw err;
          }
    }

    /**
     *     static async updateQuantity(quantity,productId,productUserId,userId,callback){
        const db= await pool.getConnection();
        try{
            if(productUserId!==userId){
                await db.beginTransaction();
                if(quantity!==0){
                    console.log("Adding : "+quantity)
                    await db.query(
                        `
                        UPDATE Cart
                        SET quantity=?
                        WHERE productId =?  AND userId =?
                        `,
                    [quantity,productId,userId]
                    );
                }else if(quantity===0){
                    await db.query(
                        `
                        DELETE FROM Cart
                        WHERE productId =? AND userId =?
                        `,
                        [productId,userId]
                        );
                }
            await db.commit();
            }
            const query2 = `
            SELECT productId
            from Cart
            WHERE userId =?
            `;
        
            const [cart] = await pool.execute(query2, [this.userId]);
            const newCart = cart.map(item=> item.productId)

            callback(null, newCart);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating quantity:", err);
            callback("An error occured while updating quantity:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }
     */
}

module.exports = Cart;
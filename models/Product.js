const pool = require('../db');
const bcrypt = require('bcrypt');
const Uuid = require('./Uuid');
const authenticate = require('../authenticate')

class Product{
    constructor(product,userId){
        const {productName,
               price,
               stockQuantity,
               category,
               pCondition,
               damages,
               delevery,
               deleveryNote,
               acceptCash,
               productDescription,
               images}=product;
               
        this.productName = productName;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.category = category;
        this.pCondition = pCondition;
        this.damages = damages;
        this.delevery = delevery;
        this.deleveryNote = deleveryNote;
        this.acceptCash = acceptCash;
        this.productDescription = productDescription;
        this.userId = userId;
        this.images = images;
    }

    async createProduct(callback){
        let university = await this.getUNiversity();
        const db= await pool.getConnection();
        try {
            let productId = Uuid.generateId()
            const resp = await db.execute(`SELECT * FROM Products WHERE productId =?`,[productId])
            if(resp.length!==0) productId = Uuid.generateId();
            
            // Start a database transaction
            await db.beginTransaction();
    
            // Insert user Products
            await db.query(
                `INSERT INTO Products (
                    productId,
                    userId,
                    productName,
                    price,
                    stockQuantity,
                    category,
                    pCondition,
                    damages,
                    delevery,
                    deleveryNote,
                    acceptCash,
                    productDescription,
                    university
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [productId,this.userId,this.productName,this.price,this.stockQuantity,this.category,
                this.pCondition,this.damages,this.delevery,this.deleveryNote,this.acceptCash,this.productDescription,university]
            );
    
            //save the images to the database
            for(var i=0;i<this.images.length;i++){
                await db.query(
                    `INSERT INTO productImages (productId, imagePath)
                    VALUES (?, ?)`,
                    [productId, this.images[i]]
                );
            }
    
            // Commit the transaction if everything is successful
            await db.commit();

            callback(null, productId);
        } catch (err) {
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while creating new product:", err);
            callback("An error occured while creating new product:", null);
        }finally {
           db.release(); // Release the connection back to the pool.
          }
    }

    async getUNiversity(){
        try{
            const [rows] = await pool.execute(
                `SELECT university FROM address WHERE userId = ?`,
                [this.userId]
            );
    
            if(rows.length===0){
                return null;
            }
    
            const user = rows[0];
    
            return user.university;
    
        }catch (err){
            throw err;
        }
    }

    static async updtateProduct(productId, price,quantity,userId,callback){
        const db= await pool.getConnection();
        try{
            await db.beginTransaction();
            if(price!==null||price!==undefined){
                const [rowPrice] = await pool.execute(
                    `  SELECT price FROM Products WHERE productId=?`,
                    [productId]
                );
                if(rowPrice[0].price>price){
                    await db.query(
                        `
                        UPDATE Products
                        SET prevPrice=?, 
                            price=?, 
                            onPromotion=true
                        WHERE productId=?
                        `,
                        [rowPrice[0].price,price, productId]
                      );
                    }else{
                        await db.query(
                            `
                            UPDATE Products
                            SET  
                                price=?
                                
                            WHERE productId=?
                            `,
                            [price, productId]
                          );
                    }
                
                
            }

            if(quantity!==null||quantity!==undefined){
                await db.query(
                    `
                    UPDATE Products
                    SET stockQuantity=?
                    WHERE productId=?
                    `,
                    [quantity, productId]
                  );
            }

            await db.commit();

            callback(null, productId);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while creating new product:", err);
            callback("An error occured while updating a product", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
       

    }
    
    static async getProductById(productId,userId){
        try{
            const [rows] = await pool.execute(
                `  SELECT p.*,c.name,u.firstName,u.lastName,u.image
                FROM Products p
                JOIN userProfile u ON p.userId = u.userId
                LEFT JOIN campusStore c ON u.userId = c.userId
                WHERE p.productId = ?`,
                [productId]
            );

            const [rowsImages] = await pool.execute(
                `  SELECT *
                FROM productImages
                WHERE productId = ?`,
                [productId]
            );

            const query = `
            SELECT productId
            from Cart
            WHERE userId =?
           `;
       
           const [cart] = await pool.execute(query, [userId]);
           const newCart = cart.map(item=> item.productId)
            if(rows.length===0){
                return null;
            }

            const [reviews] = await pool.execute(
              `SELECT r.*,u.firstName,u.lastName,u.image
               FROM reviews r
               JOIN userProfile u ON r.userId = u.userId
               WHERE r.productId =?
              `,
              [productId]
          );
    
            const product = rows[0];
            //console.log(product)
            console.log("reviews")
            console.log(reviews)
            
            return {product,newCart,rowsImages,reviews};
    
        }catch (err){
            throw err;
        }
    }

    static async getProducts(startIndex, countPerPage,userId) {
        try {    
          const query = `
            SELECT p.productId,p.productRatings,p.productName,p.price,p.prevPrice,p.onPromotion,p.category,p.university, u.userId,u.firstName,u.lastName,u.image, pi.imagePath
            FROM Products p
            JOIN userProfile u ON p.userId = u.userId
            LEFT JOIN (
                SELECT productId, MIN(imagePath) AS imagePath
                FROM productImages
                GROUP BY productId
            ) pi ON p.productId = pi.productId
            WHERE u.isStudent = true
            ORDER BY p.createdAt DESC;
            
          `;
          //LIMIT ?, ?;
      
          const [products] = await pool.execute(query);

          const query2 = `
          SELECT productId
          from Cart
          WHERE userId =?
         `;
     
         const [cart] = await pool.execute(query2, [userId]);
         const newCart = cart.map(item=> item.productId)
          if (products.length === 0) {
            return null;
          }
      
          return {products,newCart};
        } catch (err) {
          throw err;
        }
    }

    static async searchProducts(name,userId) {
      console.log("searching")
      try {    
        const query = `
          SELECT p.productId,p.productRatings,p.productName,p.price,p.prevPrice,p.onPromotion,p.category,p.university, u.userId,u.firstName,u.lastName,u.image, pi.imagePath
          FROM Products p
          JOIN userProfile u ON p.userId = u.userId
          LEFT JOIN (
              SELECT productId, MIN(imagePath) AS imagePath
              FROM productImages
              GROUP BY productId
          ) pi ON p.productId = pi.productId
          WHERE u.isStudent = true
          AND p.productName LIKE ?
          ORDER BY p.createdAt DESC;
          
        `;
        //LIMIT ?, ?;
    
        const [products] = await pool.execute(query,[`%${name}%`]);
            console.log(products)
        const query2 = `
        SELECT productId
        from Cart
        WHERE userId =?
       `;
   
       const [cart] = await pool.execute(query2, [userId]);
       const newCart = cart.map(item=> item.productId)
        
    
        return {products,newCart};
      } catch (err) {
        throw err;
      }
  }


      static async getStoreProducts(storeId,userId) {
        try {
          const query = `
            SELECT p.*, u.*, pi.imagePath
            FROM Products p
            JOIN userProfile u ON p.userId = u.userId
            LEFT JOIN (
                SELECT productId, MIN(imagePath) AS imagePath
                FROM productImages
                GROUP BY productId
            ) pi ON p.productId = pi.productId
            WHERE u.userId =?
            ORDER BY p.createdAt DESC;
          `;
      
          const [rows] = await pool.execute(query, [storeId]);
      
          if (rows.length === 0) {
            return null;
          }

          const [rowsStore] = await pool.execute(
            `SELECT name
            FROM campusStore
            WHERE userId = ?`,
            [storeId]
        );

        const query2 = `
        SELECT productId
        from Cart
        WHERE userId =?
       `;
   
       const [cart] = await pool.execute(query2, [userId]);
       const newCart = cart.map(item=> item.productId)
          // Modify the rows to structure the response as needed
          const products = rows.map((row) => {
            return {
              product: {
                productId: row.productId,
                productName: row.productName,
                university: row.university,
                productRatings: row.productRatings,
                price: row.price,
                prevPrice: row.prevPrice ,
                onPromotion: row.onPromotion,
                category: row.category,
                userId: row.userId,
                name: rowsStore[0].name,
                image: row.image,
                imagePath: row.imagePath,
              } 
            };
          });
      
          return {products,newCart};
        } catch (err) {
          throw err;
        }
      }

      static async getUserProducts(storeId,userId) {
        try {
          const query = `
            SELECT p.*, u.*, pi.imagePath
            FROM Products p 
            JOIN userProfile u ON p.userId = u.userId
            LEFT JOIN (
                SELECT productId, MIN(imagePath) AS imagePath
                FROM productImages
                GROUP BY productId
            ) pi ON p.productId = pi.productId
            WHERE u.userId =?
            ORDER BY p.createdAt DESC;
          `;
      
          const [rows] = await pool.execute(query, [storeId]);
      
          if (rows.length === 0) {
            return null;
          }

        const query2 = `
        SELECT productId
        from Cart
        WHERE userId =?
       `;
   
       const [cart] = await pool.execute(query2, [userId]);
       const newCart = cart.map(item=> item.productId)
          // Modify the rows to structure the response as needed
          const products = rows.map((row) => {
            return {
              product: {
                productId: row.productId,
                productName: row.productName,
                university: row.university,
                productRatings: row.productRatings,
                price: row.price,
                prevPrice: row.prevPrice ,
                onPromotion: row.onPromotion,
                category: row.category,
                userId: row.userId,
                name: row.firstName.split(' ')[0] +' '+row.lastName.split(' ')[0],
                image: row.image,
                imagePath: row.imagePath,
                quantity: row.stockQuantity
              } 
            };
          });
      
          return {products,newCart};
        } catch (err) {
          throw err;
        }
      }
      static async deleteProduct(productId, userId,callback){
        console.log("Delete function")
        const db= await pool.getConnection();
        try{
            await db.beginTransaction();
                    await db.query(
                        `
                        DELETE FROM Products
                        WHERE productId=? AND userId =?
                        `,
                        [productId,userId]
                      );
      
            await db.commit();
            console.log("Deleted item")
            callback(null, productId);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while creating new product:", err);
            callback("An error occured while updating a product", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
       
    }   
    
    static async createReview(productId, userId,review,stars,callback){
      console.log("Delete function")
      const db= await pool.getConnection();
      try{
          await db.beginTransaction();
                  await db.query(
                      `
                      INSERT INTO reviews(
                        userId,productId,review,stars
                      )
                      VALUES(?,?,?,?)
                      `,
                      [userId,productId,review,stars]
                    );

                    await db.query(
                      `
                      UPDATE Products
                      SET productRatings = (SELECT AVG(stars) from reviews WHERE productId=?)
                      WHERE productId=?
                      `,
                      [productId,productId]
                    );
                    await db.query(
                      `
                      UPDATE userProfile
                      SET avgRatings = (SELECT AVG(productRatings) from Products WHERE userId=?)
                      WHERE userId=?
                      `,
                      [userId,userId]
                    ); 
    
          await db.commit();
          console.log("Deleted item")
          callback(null, productId);
      }catch(err){
          // Rollback the transaction in case of an error
          await db.rollback();

          console.error("Error while creating new product:", err);
          callback("An error occured while updating a product", null);
      }finally {
          db.release(); // Release the connection back to the pool.
         }
     
  }  
  static async getReviews(productId){
    try{
        const [rows] = await pool.execute(
            `SELECT r.*,u.firstName,u.lastName
             FROM reviews r
             JOIN userProfile u ON r.userId = u.userId
             WHERE r.productId =?
            `,
            [productId]
        );

        

        return user.university;

    }catch (err){
        throw err;
    }
}

      
}

module.exports = Product
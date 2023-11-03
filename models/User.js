const pool = require('../db');
const bcrypt = require('bcrypt');
const Uuid = require('./Uuid');
const authenticate = require('../authenticate')

class User {

  constructor(userProfile,authUser,address,campusStore){
   const {firstName, lastName, email, studentEmail, phoneNumber, isStudent,isVerified,image} = userProfile
   this.firstName = firstName;
   this.lastName = lastName;
   this.email = email;
   this.studentEmail = studentEmail;
   this.phoneNumber = phoneNumber;
   this.isStudent = isStudent;
   this.isVerified = isVerified;
   this.image = image;
   
   //Authentication credentials
   this.password = authUser.password;


   //address details

   const {university,city,campus,location,residenceName} = address;
   this.university = university;
   this.city = city;
   this.campus = campus;
   this.location = location;
   this.residenceName = residenceName;

    //store details
    const {name} = campusStore;
    this.storeName = name;
}
 

 /* createUser(callback) {

    const uuid = new Uuid(this.email)
    const userId = uuid.getIdWithEmail()
    const query =`
        INSERT INTO userProfile (userId,firstName,lastName,email,studentMail,phoneNumber,isVerified,image,isStudent)
                                VALUES(?,?,?,?,?,?,?,?,?)
    `

    db.query(query, [userId,this.firstName,this.lastName,this.email,this.studentEmail,this.phoneNumber,this.isVerified,this.image,this.isStudent], (err, userProfile) => {
      
        if (err) {
            console.log("Error while creating Student Profile")
            return callback(err, null);
        }
        
        
        const query2 = `
            INSERT INTO address (addressId,userId,university,city,campus,location,residenceName)
            VALUES (?,?,?,?,?,?,?)
        `
        const addressId = Uuid.generateId()
        db.query(query2,[addressId,userId,this.university,this.city,this.campus,this.location,this.residenceName],(err,address)=>{
            if (err) {
                console.log("Error while creating Address")
                db.query('DELETE FROM userProfile WHERE userId=?',userId)
                return callback(err, null);
            }
        })

        const query3 = `
            INSERT authUser (userId, passwordHash,email)
            VALUES (?,?,?)
        `

        db.query(query3,[userId,this.hashedPassword,this.email],(err,authUser)=>{
            if (err) {
                console.log("Error while creating AuthUser")
                db.query('DELETE FROM userProfile WHERE userId=?',userId)
                db.query('DELETE FROM authUser WHERE userId=?',userId)
                return callback(err, null);
            }
        })

        const newUser = { userId: userId };
        callback(null, newUser);
    });
  }*/

  async createUser(callback) {

    const db= await pool.getConnection();
    try {
        const uuid = new Uuid(this.email);
        const userId = uuid.getIdWithEmail();

        // Start a database transaction
        await db.beginTransaction();

        // Insert user profile
        await db.query(
            `INSERT INTO userProfile (userId, firstName, lastName, email, studentMail, phoneNumber, isVerified, image, isStudent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, this.firstName, this.lastName, this.email, this.studentEmail, this.phoneNumber, this.isVerified, this.image, this.isStudent]
        );

        // Insert user address
        let addressId = Uuid.generateId();
        const results = await db.execute(`SELECT * FROM address WHERE addressId =?`,[addressId])
        if(results.length!==0) addressId = Uuid.generateId();
        await db.query(
            `INSERT INTO address (addressId, userId, university, city, campus, location, residenceName)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [addressId, userId, this.university, this.city, this.campus, this.location, this.residenceName]
        );

        // Insert authUser
        const hashedPassword = (await this.encryptPassword(this.password)).toString();
        await db.query(
                `INSERT INTO authUser (userId, passwordHash, email)
                VALUES (?, ?, ?)`,
                [userId, hashedPassword, this.email]
        );


        // Register a Shop.
        if(!this.isStudent){
            let storeId = Uuid.generateId()
            const results = await db.execute(`SELECT * FROM campusStore WHERE storeId =?`,[storeId])
            if(results.length!==0){ storeId = Uuid.generateId();}
            await db.query(
                `INSERT INTO campusStore (userId,storeId,name)
                VALUES (?,?,?)
                `,
                [userId,storeId,this.storeName]
            )

        }

        // Commit the transaction if everything is successful
        await db.commit();

        const token = authenticate.signToken(userId);
        callback(null, token);
    } catch (err) {
        // Rollback the transaction in case of an error
        await db.rollback();
               // Log a descriptive error message with the source
            console.error("Error in createUser:", err);

               // Check if the error is a duplicate key error
            if (err && err.code === 'ER_DUP_ENTRY') {
                // Determine which table caused the error based on the SQL query
                const errorMessage = err.sql || '';
                if (errorMessage.includes('userProfile')) {
                    console.error("Duplicate key error in userProfile:", err);
                    callback("User Exist", null);
                } else if (errorMessage.includes('address')) {
                    console.error("Duplicate key error in address:", err);
                    callback("Duplicate Address Key or CamousStore key", null);
                } else {
                    console.error("Unknown duplicate key error:", err);
                    callback("Unknown duplicate key error", null);
                }
            } else {
                // Handle other errors
                console.error("Error while creating user:", err);
                callback(err, null);
            }
    }finally {
       db.release(); // Release the connection back to the pool.
      }
}

  static findById(userId, callback) {
    db.query('SELECT * FROM userProfile WHERE userId = ?', [userId], (err, results) => {
      if (err) {
        return callback(err, null);
      }
      if (results.length === 0) {
        return callback(null, null);
      }
      const user = results[0];
      callback(null, user);
    });
  }

  async encryptPassword(password){
    console.log("Encrypt Password : "+password)
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("done : "+hashedPassword)
    return hashedPassword
  }

static async getUserByEmail(email){
    try{
        const [rows] = await pool.execute(
            `SELECT userId FROM authUser WHERE email = ?`,
            [email]
        );

        if(rows.length===0){
            return null;
        }

        const user = rows[0];

        return user

    }catch (err){
        throw err;
    }
}

static async getUserByContact(contact){
    try{
        const [rows] = await pool.execute(
            `SELECT userId FROM userProfile WHERE phoneNumber = ?`,
            [contact]
        );

        if(rows.length===0){
            return null;
        }

        const user = rows[0];

        return user

    }catch (err){
        throw err;
    }
}

static async getUserById(userId){
    try{
        const [rows] = await pool.execute(
            `
            SELECT 
                u.userId, 
                u.firstName, 
                u.lastName, 
                u.image, 
                u.isStudent,
                c.name 
            FROM 
                userProfile u
            LEFT JOIN 
                campusStore c
            ON 
                u.userId = c.userId 
            WHERE 
                u.userId = ?
            `,
            [userId]
        );
        console.log("DB rows: " + rows)
        if(rows.length===0){
            return null;
        }

        const user = rows[0];
        console.log("DB: " + user)
        return user

    }catch (err){
        throw err;
    }
}

static async authorizeUser(email,password) {
    try {
        // Retrieve user information based on email
        
        const [rows] = await pool.execute(
            `SELECT userId, passwordHash FROM authUser WHERE email = ?`,
            [email]
        );
            console.log(rows)
        // Check if a user with the given email was found
        if (rows.length === 0) {
            // Handle the case where the user does not exist
            return null; // You can return null or throw an error as appropriate
        }

        // Compare the provided password with the stored password hash
        const userId = rows[0].userId;

       

        const passwordMatch = await bcrypt.compare(password, rows[0].passwordHash);

        if (passwordMatch) {

            const [profileRow] = await pool.execute( //display account type on home screen
            `SELECT firstName, lastName,image,isStudent, avgRatings AS ratings FROM userProfile WHERE userId = ?`,
            [userId]
            );

            const profile = profileRow[0];
            // Passwords match, return a JWT token to the user
            const token = authenticate.signToken(userId);
            return {token,userId,profile};
        } else {
            // Passwords do not match
            return null; // You can return null or throw an error as appropriate
        }
    } catch (err) {
        // Handle any database or other errors
        console.error("Error authorizing user:", err);
        //return err
        throw err; // You might want to throw the error or handle it as needed
    }
}

static async getChannels(userId){
    try {
        const query = `
         SELECT u.firstName,u.lastName,u.userId,u.image,c.name 
         FROM userProfile u 
         LEFT JOIN campusStore c ON u.userId = c.userId
         WHERE u.userId !=?
        `;
    
        const [rows] = await pool.execute(query, [userId]);
    
        return rows;
      } catch (err) {
        throw err;
      }
}

static async updtateProfilePic(userId, imagePath,callback){
    const db= await pool.getConnection();
    try{
        await db.beginTransaction();
            await db.query(
                `
                UPDATE userProfile
                SET image=? 
                WHERE userId=?
                `,
                [imagePath, userId]
              );

        await db.commit();

        callback(null, imagePath);
    }catch(err){
        // Rollback the transaction in case of an error
        await db.rollback();

        console.error("Error while updating profile picture:", err);
        callback("An error occured while updating profile picture:", null);
    }finally {
        db.release(); // Release the connection back to the pool.
       }
   

}

static async getCampusStores(){
    try {
        const query = `
        SELECT u.userId AS storeId, u.image,u.avgRatings, a.university, c.name
        FROM userProfile u
        JOIN address a ON u.userId = a.userId
        JOIN campusStore c ON u.userId = c.userId
        `;
    
        const [rows] = await pool.execute(query, []);
    
        return rows;
      } catch (err) {
        throw err;
      }
}


}

module.exports = User;

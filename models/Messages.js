const pool = require('../db');
const bcrypt = require('bcrypt');
const Uuid = require('./Uuid');
const authenticate = require('../authenticate')

class Message{

    static async addNewMessage(linkId,fromUserId,productId,sendTo,_text,_time,callback){
        const db= await pool.getConnection();
        try{
            await db.beginTransaction();
            await db.query(
                        `
                        INSERT INTO messages(linkId,fromUserId,sendTo,productId,_text,_time)
                        VALUES(?,?,?,?,?,?)
                        `,
                [linkId,fromUserId,sendTo,productId,_text,_time]
                );
            
                //Update the lastwrite for good sorting
            await db.query(`
                UPDATE communicationLink
                SET lastWrite = CURRENT_TIMESTAMP
                WHERE linkId = ?;
            `,[linkId])
                
            await db.commit();

            callback(null, 'done');
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while adding to cart:", err);
            callback("An error occured while adding to cart:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    static async updateMessage(linkId,callback){
        const db= await pool.getConnection();
        try{
                await db.beginTransaction();
                    await db.query(
                        `
                        UPDATE messages
                        SET opened=true
                        WHERE linkId =?
                        `,
                    [linkId]
                    );
            await db.commit();
            callback(null, 'Done');
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating message:", err);
            callback("An error occured while updating quantity:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }
    //Http request this one when there is nocommunication channel
    static async createComChannel(user_1_id,user_2_id,callback){
        const db= await pool.getConnection();
        let linkId = Uuid.generateId()
        const resp = await db.execute(`SELECT linkId FROM communicationLink WHERE linkId =?`,[linkId])
        if(resp.length!==0) linkId = Uuid.generateId();
        try{
                await db.beginTransaction();
                    await db.query(
                        `
                        INSERT INTO communicationLink(
                            linkId,
                            user_1_id,
                            user_2_id
                        )
                        VALUES(?, ?, ?);
                        `,
                        [linkId,user_1_id,user_2_id]
                        );
                await db.commit();


            callback(null, linkId);
        }catch(err){
            // Rollback the transaction in case of an error
            await db.rollback();

            console.error("Error while updating quantity:", err);
            callback("An error occured while updating quantity:", null);
        }finally {
            db.release(); // Release the connection back to the pool.
           }
    }

    static async getComChannels(userId){
        try {
            const query = `
            SELECT
    MAX(cl.linkId) AS linkId,
    MAX(cl.lastWrite) AS lastWrite,
    otherUser.firstName AS firstName,
    otherUser.lastName AS lastName,
    otherUser.isStudent AS isStudent,
    otherUser.userId AS userId,
    otherUser.image AS image,
    MAX(pi._text) AS _text,
    MAX(fromUserId) AS fromUserId
    FROM communicationLink AS cl
    JOIN userProfile AS otherUser ON
        (cl.user_1_id = ? AND cl.user_2_id = otherUser.userId)
        OR
        (cl.user_2_id = ? AND cl.user_1_id = otherUser.userId)
    LEFT JOIN (
        SELECT linkId,MAX(_text) AS _text,MAX(fromUserId) AS fromUserId, MAX(createdAt) AS maxCreatedAt
        FROM messages
        GROUP BY linkId
    ) AS pi ON cl.linkId = pi.linkId
    WHERE ? IN (cl.user_1_id, cl.user_2_id)
    GROUP BY otherUser.userId
    ORDER BY MAX(cl.lastWrite) DESC;

            `;
        
            const [rows] = await pool.execute(query, [userId,userId,userId]);
            
            if (rows.length === 0) {
              return null;
            }
        
            return rows;
          } catch (err) {
            throw err;
          }
    }

    /**
     * 
     * SELECT
            cl.lastWrite,
            otherUser.firstName AS firstName,
            otherUser.lastName AS lastName,
            otherUser.image AS image,
            latestMsg.*,
            cs.name AS storeName
            FROM communicationLink AS cl
            LEFT JOIN (
                SELECT
                    m.linkId,
                    MAX(m.createdAt) AS latestMsgTime
                FROM messages AS m
                WHERE m.fromUserId = ?
                GROUP BY m.linkId
            ) AS latestMsgTime ON cl.linkId = latestMsgTime.linkId
            LEFT JOIN messages AS latestMsg ON latestMsgTime.linkId = latestMsg.linkId AND latestMsgTime.latestMsgTime = latestMsg.createdAt
            LEFT JOIN userProfile AS otherUser ON
                (cl.user_1_id = ? AND cl.user_2_id = otherUser.userId)
                OR
                (cl.user_2_id = ? AND cl.user_1_id = otherUser.userId)
            LEFT JOIN campusStore AS cs ON cs.userId = otherUser.userId
            ORDER BY cl.lastWrite DESC;
     */

            /**
             * 
             * Working fine
             *             SELECT
                MAX(cl.linkId) AS linkId,
                MAX(cl.lastWrite) AS lastWrite,
                otherUser.firstName AS firstName,
                otherUser.lastName AS lastName,
                otherUser.isStudent AS isStudent,
                otherUser.userId AS userId
            FROM communicationLink AS cl
            JOIN userProfile AS otherUser ON
                (cl.user_1_id = ? AND cl.user_2_id = otherUser.userId)
                OR
                (cl.user_2_id = ? AND cl.user_1_id = otherUser.userId)
            WHERE ? IN (cl.user_1_id, cl.user_2_id)
            GROUP BY otherUser.userId
            ORDER BY MAX(cl.lastWrite) DESC;

             */
//Http request this one when there is nocommunication channel
    static async getChannelDetails(linkId,userId){
        try {
            const query = `
            SELECT
                cl.linkId,
                cl.lastWrite,
                user2.firstName AS firstName,
                user2.lastName AS lastName,
                user2.image AS image,
                latestMsg.*,
                cs.name AS storeName
            FROM communicationLink AS cl
            LEFT JOIN (
                SELECT
                    m.linkId,
                    MAX(m.createdAt) AS latestMsgTime
                FROM messages AS m
                WHERE m.fromUserId = ?
                GROUP BY m.linkId
            ) AS latestMsgTime ON cl.linkId = latestMsgTime.linkId
            LEFT JOIN messages AS latestMsg ON latestMsgTime.linkId = latestMsg.linkId AND latestMsgTime.latestMsgTime = latestMsg.createdAt
            LEFT JOIN userProfile AS user2 ON
                cl.user_2_id = user2.userId
            LEFT JOIN campusStore AS cs ON cs.userId = user2.userId
            WHERE cl.linkId = ?;

            `;
        
            const [rows] = await pool.execute(query, [userId,linkId]);
        
            if (rows.length === 0) {
              return null;
            }
        
            return rows[0];
          } catch (err) {
            throw err;
          }
    }

//Http request this one when there is nocommunication channel
    static async getMessages(linkId){
        try {
            const query = `
            SELECT * FROM messages 
            WHERE linkId = ?
            ORDER BY createdAt DESC LIMIT 50;
            `;
        
            const [rows] = await pool.execute(query, [linkId]);
            console.log(rows)
            return rows;
          } catch (err) {
            throw err;
          }
    }

    //First check if a channel between the two users exist? then use the link id toretrieve all the messages
    static async getChannelId(user1,user2){
        try {
            const query = `
            SELECT linkId
            FROM communicationLink
            WHERE (user_1_id = ? AND user_2_id = ?) OR (user_1_id = ? AND user_2_id = ?);
            `;
        
            const [rows] = await pool.execute(query, [user1,user2,user1,user2]);
        
            if (rows.length === 0) {
              return null;
            }
            console.log("Chennel Id :"+rows[0].linkId)
            return rows[0].linkId;
          } catch (err) {
            throw err;
          }
    }
                                                    

}

module.exports = Message;
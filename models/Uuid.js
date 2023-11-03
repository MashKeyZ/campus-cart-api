const uuid = require('uuid');

class Uuid{
    constructor(email){
        this.email = email;
        this.namespaceUUID = uuid.v4().toString();
    }

   static generateId(){
    return uuid.v4().toString()
   }

   getIdWithEmail(){
    return uuid.v5(this.email, this.namespaceUUID).toString();
   }

}

module.exports = Uuid;
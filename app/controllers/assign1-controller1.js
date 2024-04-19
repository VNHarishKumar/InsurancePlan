import Ajv from 'ajv';
import fs from 'fs';
import * as databaseService from './../services/assign1-service.js';
import crypto from 'crypto';
import { response } from 'express';


// Read the JSON schema from schema.json
const schemaPath = 'schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

//--------------------- Getting entire data in DB ---------------------------------------
export const get_data = async(req,res) =>{

  try {
    const val = req.body;
    if(Object.keys(val).length > 0)
    {
      console.log("In controler if", val);
      payload("Pay load not allowed", res);
    }
    else
    {
    const getARecord = await databaseService.get();
    successfulGet(getARecord, res);
    }
  }
  catch(error){
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }

}
//--------------------- Getting entire data in DB END------------------------------------
 const generateHash = (data) => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

//--------------------- Getting a data in DB --------------------------------------------
export const get_data_by_id = async(req,res) =>{
  try {
    const val = req.body;
    const id = req.params.id;
    if (Object.keys(val).length > 0)
    {
      console.log("In controler if", val);
      payload("Pay load not allowed", res);
    }
    else
    {
      const clientProvidedETag = req.headers['if-none-match'];
      console.log("Client Etag service:", clientProvidedETag);


  
      const getARecordById = await databaseService.get_id(id);
      // console.log("Data retrived",getARecordById);

      if (getARecordById == null)
      {
        idNotPresent("Key not available in redis",res);
      }
      else
      {
        console.log("before hashing",clientProvidedETag);
        const hashedData = generateHash(JSON.stringify(getARecordById));
        console.log("after hashing",hashedData);
        if (hashedData == clientProvidedETag)
        {
          ifnotmatch(req, res);
          }
        else {
          res.set('ETag', hashedData);
            successfulGet(getARecordById, res);
          }
      }
    }
  }
  catch(error){
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }

}
//--------------------- Getting a data in DB END-----------------------------------------

//--------------------- Posting a data in DB---------------------------------------------

// Function to create Ajv validator instance
const createValidator = () => {
  return new Ajv({ allErrors: true, additionalProperties: false }).compile(schema);
  };
  
  // Function to validate data against the schema
  const validateData = (data, validator) => {
    return validator(data);
  };

export const post_data = async(req,res) =>{
    
    try {
        // Create Ajv validator instance
        const validator = createValidator();
    
        // Validate the request data against the schema
      const isValid = validateData(req.body, validator);
      
        if (!isValid) 
        {
          // If validation fails, send the validation errors
          validateError({ errors: validator.errors },res)
        }
        else
        {

          
          const newrecord = req.body;
          
            const postARecord = await databaseService.post(req, newrecord);
          

            console.log("before hashing");
            const hashedData = generateHash(JSON.stringify(newrecord));
            console.log("after hashing");
            res.set('ETag', hashedData);
          
          if (postARecord.success) {
            successfulStorage(postARecord, res);
          }
          else {
            Idexist(postARecord, res);
          }
          
        }
      } catch (error) {
        // Handle other errors if necessary
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

}

//--------------------- Posting a data in DB END-----------------------------------------

//--------------------- Deleting a data in DB -------------------------------------------
export const delete_data = async (req, res) => {
  try {
    const val = req.body;
    const id = req.params.id;
    if (Object.keys(val).length > 0)
    {
      payload("Pay load not allowed", res);
    }
    else
    {
      
      const getARecordById = await databaseService.get_id(id);
      if (getARecordById == null)
      {
        idNotPresent("Key not available in redis", res);
      }
      else
      {
        const deleteARecordById = await databaseService.del(id);
        successfulDelete(deleteARecordById, res);
      }
    }
  }
  catch(error){
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
    
}
//--------------------- Deleting a data in DB END----------------------------------------

//--------------------- PATCH a data in DB START----------------------------------------


export const patch_data = async (req, res) => {
  try {
     const validator = createValidator();
    
        // Validate the request data against the schema
        const isValid = validateData(req.body, validator);
    
    if (!isValid) {
      // If validation fails, send the validation errors
      validateError({ errors: validator.errors }, res)
    }
    else {
       const id = req.params.id;
      const clientProvidedETag = req.headers['if-match'];
      console.log("Client Etag service:", clientProvidedETag);
      const getARecordById = await databaseService.get_id(id);
      const hashedData = generateHash(JSON.stringify(getARecordById));
      console.log("after hashing", hashedData);
      // && clientProvidedETag != null
      if (hashedData != clientProvidedETag ) {
        ifmatch(req, res);
      }
      else {

        const patchARecordById = await databaseService.patch_id(req, id);
        if (patchARecordById == null) {
          idNotPresent("Key not available in redis", res);
        }
        else {
          const getAUpdatedRecordById = await databaseService.get_id(id);
          const hashedData2 = generateHash(JSON.stringify(getAUpdatedRecordById));
           res.set('ETag', hashedData2);
          
          successfulDelete(patchARecordById, res);
        }
      }
    }
  }
  catch(error){
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
}

//--------------------- PATCG a data in DB END----------------------------------------


// -------------------- STATUS CODE BLOCK------------------------------------------------

export const successfulStorage = (obj, response) => {
  response.set('Cache-Control', 'no-cache');
  response.status(201);
  response.json(obj);
  const clientProvidedETag = response.get('ETag');
  console.log("Client Etag service:", clientProvidedETag);
}

export const Idexist = (obj, response) => {
  response.set('Cache-Control', 'no-cache');
  response.status(409);
  response.json(obj);

}

export const validateError = (obj, response) => {
    response.set('Cache-Control', 'no-cache');
    response.status(400);
    response.json(obj);
}

export const successfulGet = (obj, response) => {
  response.set('Cache-Control', 'no-cache');
  response.status(200);
  response.json(obj);
  console.log(response.get('ETag'));
}

export const successfulDelete = (obj, response) => {
    response.set('Cache-Control', 'no-cache');
    response.status(204);
    response.json(obj);
}

export const payload = (info, response) => {
      response.set('Cache-Control', 'no-cache');
    response.status(400);
  response.json({ info });
}

export const idNotPresent = (info, response) => {
      response.set('Cache-Control', 'no-cache');
    response.status(404);
  response.json({ info });
}

export const notFound = async (req, response) => {
      response.set('Cache-Control', 'no-cache');
  response.status(404);
  response.json({error: "Request method not allowed"});
}


export const ifnotmatch = async (request, response) => {
  response.set('Cache-Control', 'no-cache');
  response.status(304);
  response.json();
}

export const ifmatch = async (request, response) => {
  response.set('Cache-Control', 'no-cache');
  response.status(412);
  response.json({error: "ETag does not match"});
}

// export const idAlreadyPresent = async (info, response) => {
//     response.set('Cache-Control', 'no-cache');
//     response.status(409);
//   response.json({ info });
// }

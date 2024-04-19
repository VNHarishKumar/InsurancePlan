import redis,{createClient} from 'redis';
import { v4 as uuidv4 } from 'uuid'; 
import { Client } from '@elastic/elasticsearch';
import elasticsearch from 'elasticsearch';
import { connect } from 'amqplib/callback_api.js'; 
import amqp from 'amqplib';
import { readFileSync } from 'fs';
// import { connect } from 'amqplib'; 
import { save,deleteDocument } from './elasticservice.js';

let redisClient;
// RabbitMQ connection URL
const ampqURL = 'amqp://localhost';

// Publisher function
async function publishMessage(queueName, message) {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect(ampqURL);
    // Create a channel
    const channel = await connection.createChannel();
    // Assert queue exists
    
    await channel.assertQueue(queueName);
     const messageString = JSON.stringify(message);
    // Publish the message to the queue
    await channel.sendToQueue(queueName, Buffer.from(messageString));
    // console.log(`Message sent: ${message}`);
    // Close the connection
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error(error);
  }
}


async function publishMessageDelete(queueName, message) {
  try {
    console.log("INISDE DELETE RABBITMQ MSG");
    // Connect to RabbitMQ server
    const connection = await amqp.connect(ampqURL);
    // Create a channel
    const channel = await connection.createChannel();
    // Assert queue exists
    
    await channel.assertQueue(queueName);
     const messageString = JSON.stringify(message);
    // Publish the message to the queue
    await channel.sendToQueue(queueName, Buffer.from(messageString));
    // console.log(`Message sent: ${message}`);
    // Close the connection
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error(error);
  }
}


async function consumeMessageDelete(queueName) {
  try {
    console.log("Inside delete rabbitmq consume");
    // Connect to RabbitMQ server
    const connection = await amqp.connect(ampqURL);
    // Create a channel
    const channel = await connection.createChannel();
    // Assert queue exists
    await channel.assertQueue(queueName);
    // Consume messages from the queue
    await channel.consume(queueName, (message) => {
      if (message !== null) {
        console.log(`Received DELETE message: ${message.content.toString()}`);
        
        try {
          console.log("Inside elastic search delete queue");
          const messageContent = JSON.parse(message.content.toString());

          // deleteDocument(queueName, messageContent);
          deleteDocument('indexplan', messageContent);


        } catch (error) {
          console.error('Error occurred:', error);
        }

        // Acknowledge the message
        channel.ack(message);
      }
    });
  } catch (error) {
    console.error(error);
  }
}



// ----------------------------------------------- Consume Message --------------------------------------------------------------

// Consumer function
async function consumeMessage(queueName) {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect(ampqURL);
    // Create a channel
    const channel = await connection.createChannel();
    // Assert queue exists
    await channel.assertQueue(queueName);
    // Consume messages from the queue
    await channel.consume(queueName, (message) => {
      if (message !== null) {
        console.log(`Received message: ${message.content.toString()}`);
        //  console.log(`Received message Raw: ${JSON.parse(message)}`);

        const messageContent = JSON.parse(message.content.toString());
        // Acknowledge the message
 try {
      console.log("Inside elastic search");
      console.log("message:", message);
    
      // const client = createElasticsearchClient();

      try {
        
         save('indexplan', messageContent);
        
  } catch (error) {
    console.error('Error occurred while storing document:', error);
    throw error;
  }   
    // console.log('Response:', response);
  } catch (error) {
    console.error('Error occurred:', error);
  }
        channel.ack(message);
      }
    });

  } catch (error) {
    console.error(error);
  }
}

// ---------------------------------------------- Consume Message --------------------------------------------------

const createRedisClient = () => {
  // Create a promise to handle the asynchronous nature of the Redis client setup
  if(!redisClient|| redisClient.status === 'end')
  {
      redisClient = redis.createClient({
          host:"redisc", 
          port: 6379,       
        });
        
        redisClient.connect();
        
        redisClient.on('connect', () => {
          console.log('Connected to Redis server');
        });
        
        // Event listener for errors
        redisClient.on('error', (err) => {
          console.error('Error connecting to Redis:', err);
        });
      }
        return redisClient;
};


// --------------------- Post Method ----------------------------------------------------

function storeInRedis(data) {

  // Create an Elasticsearch client instance  
  // const elasticsearchClient = createElasticsearchClient();
   
   const client =  createRedisClient();
    for (let key in data) {
        if (typeof data[key] === 'object') {
          if (data[key].hasOwnProperty('objectId')) {
              
                client.hSet(`${data[key].objectType}:${data[key].objectId}`, 'field',JSON.stringify(data[key]), (err, reply) => {
                    if (err) console.error(err);
                  console.log(`Stored object with objectId ${data[key].objectId} in Redis`);
                });
            }
            storeInRedis(data[key]); // Recursively call for nested objects
        }
    }
}

export const post = async(req,value) => {
  try {
const queueName = 'myQueue';
 
    console.log("Inside Service POST method");
    const client = await createRedisClient();
    console.log("Redis client verififed successfully");
    //  const redisKey = `${req.body.objectType}:${req.body.objectId}`;
     const redisKey = `${req.body.objectId}`;

     //
    // To check whether the ID is present or not
    const field = 'field';
    const idAvailable = await client.hGet(redisKey, field);
    if (idAvailable != null)
    {
       return { success: false, message: 'Key Already present in redis', key: redisKey };
       }
      const data = req.body;
      // Convert the JavaScript object to a JSON string before storing
      const jsonString = JSON.stringify(value);
      console.log("After json string");     
      console.log("After UUID");
      
      storeInRedis(data);
    const val = client.hSet(redisKey, 'field', jsonString);

    publishMessage(queueName, data);
    consumeMessage(queueName);    
      console.log("After client set");
      return { success: true, message: 'Value stored in Redis successfully', key: redisKey };
    // }
    } catch (error) {
      console.error('Error storing value in Redis:', error);
      throw error;
    }

};

// --------------------- Post Method END ------------------------------------------------


// --------------------- GET Method Start -----------------------------------------

export const get = async() => {

  try {
    console.log("Inside Service GET method");

    const client = await createRedisClient();

    console.log("Redis client verified successfully");


    const keys = await client.keys('*'); // '*' matches all keys
  
    const val = [];
    const field = 'field';
      // Use the keys to retrieve the corresponding values
    for (const key of keys) {
      let value = await client.hGet(key,field);
              // let value = await client.get(key,field);

        const jsonObject = JSON.parse(value);
        val.push(jsonObject);
      }
      
    return val;
      
} catch (error) {
    console.error('Error retrieving values from Redis:', error);
    callback(error);
}
}

// --------------------- GET Method END -----------------------------------------

// --------------------- GET BY ID Method Start -----------------------------------------

export const get_id = async (id) => {
  
  try {
    console.log("Inside Service GET method by ID");

    const client = await createRedisClient();

    console.log("Redis client verified successfully");
    const field = 'field';

    const value = await client.hGet(id,field);
        // const value = await client.get(id,field);
    console.log(id);
    const jsonObject = JSON.parse(value);
    console.log(jsonObject);
  
      return jsonObject;
    
  }
  catch (error)
  {
    console.error('Error retrieving values from Redis:', error);
    callback(error);
  }

}

// --------------------- GET BY ID Method End -----------------------------------------

// --------------------- DELTE BY ID Method Start -----------------------------------------

function deleteFromRedis(data) {
        // const elasticsearchClient = createElasticsearchClient();

    const client = createRedisClient();
    for (let key in data) {
        if (typeof data[key] === 'object') {
          if (data[key].hasOwnProperty('objectId')) {
            
                client.del(`${data[key].objectType}:${data[key].objectId}`, 'field', (err, reply) => {
                    if (err) console.error(err);
                    console.log(`Deleted object with objectId ${data[key].objectId} from Redis`);
                });
            }
            deleteFromRedis(data[key]); // Recursively call for nested objects
        }
    }
}



export const del = async (id) => {
   try {
    console.log("Inside Service DELETE method by ID");

    const client = await createRedisClient();

    console.log("Redis client verified successfully");

     console.log("Id", id);
     const data = await client.hGet(id, 'field');
    //  console.log(data);
     const jsonvalue = JSON.parse(data);
    //  console.log(jsonvalue);
     deleteFromRedis(jsonvalue);
     const value = await client.del(id);
     
     console.log("Deleted Successfully");

const queueName = 'myDeleteQueue';
    publishMessageDelete(queueName, JSON.parse(data));
    consumeMessageDelete(queueName);

      return value;
    
  }
  catch (error)
  {
    console.error('Error retrieving values from Redis:', error);
    callback(error);
  }

}

// Function to merge existing data with new data
function mergeData(existingData, newData) {

  // Merge planCostShares
  existingData.planCostShares = newData.planCostShares;

  // Merge linkedPlanServices
  if (newData.linkedPlanServices && newData.linkedPlanServices.length > 0) {
    newData.linkedPlanServices.forEach(newService => {
      const existingServiceIndex = existingData.linkedPlanServices.findIndex(existingService => existingService.objectId === newService.objectId);
      if (existingServiceIndex !== -1) {
        // If service with the same objectId exists, overwrite it
        existingData.linkedPlanServices[existingServiceIndex] = newService;
      } else {
        // If service with the same objectId doesn't exist, add it
        existingData.linkedPlanServices.push(newService);
      }
    });
  }


  return existingData;
}

export const patch_id = async (req,id) => {
  try {
    const queueName = 'myQueue';
    console.log("Inside Service PATCH method");
    const client = await createRedisClient();
    console.log("Redis client verified successfully");
   const field = 'field';

    const value = await client.hGet(id, field);
    if (!value) {
      return value;
    }
    else {
      const existingData = JSON.parse(value);
      const data = req.body;
      console.log("Existing Data:", existingData);

      const mergedData = mergeData(existingData, data);
     
      // Convert the JavaScript object to a JSON string before storing
      const jsonString = JSON.stringify(mergedData);
       console.log("After Merge Data", mergedData);


      //  storeInRedis(data);
     
      console.log("ID:", id);
      const updated = await client.hSet(id, 'field', jsonString);
      // Retrieve the objectId from the request body
    

      console.log("After client update");

    storeInRedis(data);

      console.log("Value updated in Redis successfully");
      
        try {
      console.log("Inside elastic search");
          // const response = await storeDocument(redisKey, jsonString);
    
          const newData = await client.hGet(id, field);
    
    publishMessage(queueName, JSON.parse(newData));
    consumeMessage(queueName);


  } catch (error) {
    console.error('Error occurred:', error);
  }
    return { success: true, message: 'Value updated in Redis successfully', key: id };
 
    }
  }
  catch (error)
  {
    console.error('Error retrieving values from Redis:', error);
    callback(error);
  }
}



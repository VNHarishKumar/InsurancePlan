import app from './app/app.js';
import { establishElasticConnection } from './app/services/elasticservice.js';

const port = 9000;


app.listen(9000, () => {
    console.log(`Server listening at ${port}`)
    establishElasticConnection();
});
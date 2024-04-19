import assign1 from './assign1-route.js';
import * as notfound from '../controllers/assign1-controller1.js';
import * as mw from '../middleware/middleware.js';

const route = (app) => {
    app.use(mw.middleware);
    app.use('/v1/plan', assign1);
    app.use('*', notfound.notFound);
}

export default route;

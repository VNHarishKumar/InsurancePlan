import express from 'express';
import * as assign1 from '../controllers/assign1-controller1.js';

const router = express.Router();

router.route('/')
    .get(assign1.get_data)
    .post(assign1.post_data)
    .put(assign1.notFound)
    .patch(assign1.notFound)

router.route('/:id')
    .get(assign1.get_data_by_id)
    .delete(assign1.delete_data)
    .post(assign1.notFound)
    .put(assign1.notFound)
    .patch(assign1.patch_data)



export default router;
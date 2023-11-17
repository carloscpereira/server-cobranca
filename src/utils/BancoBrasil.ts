import axios from 'axios';

import bancoBrasilConfig from '../config/bancobrasil';

export default axios.create(bancoBrasilConfig);

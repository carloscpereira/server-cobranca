import axios from 'axios';

import cieloConfig from '../config/cielo';

export default axios.create(cieloConfig);

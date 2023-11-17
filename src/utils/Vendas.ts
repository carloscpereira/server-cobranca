import axios from 'axios';

import vendasConfig from '../config/vendas';

export default axios.create(vendasConfig);

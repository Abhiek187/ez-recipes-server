type Temp = {
  _id: string;
  createdAt: Date; // required to setup TTL
  challenge?: string; // passkey challenge data
};

export default Temp;

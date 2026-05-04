declare module 'bcrypt' {
  const bcrypt: {
    compare(data: string, encrypted: string): Promise<boolean>;
  };

  export default bcrypt;
}

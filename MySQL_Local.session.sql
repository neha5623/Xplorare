INSERT INTO users (
    id,
    first_name,
    last_name,
    email,
    password,
    gender,
    dob,
    created_at
  )
VALUES (
    id:int,
    'first_name:varchar',
    'last_name:varchar',
    'email:varchar',
    'password:varchar',
    'gender:enum',
    'dob:date',
    'created_at:timestamp'
  );

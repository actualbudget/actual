export let types = {
  id: { name: 'id', type: 'string', description: '' },
  date: { name: 'date', type: 'string', description: 'MM/DD/YYYY' }
};

export function PrimitiveTypeList() {
  return Object.keys(types).map(name => {
    return (
      <PrimitiveType
        name={types[name].name}
        type={types[name].type}
        description={types[name].description}
      />
    );
  });
}

export function PrimitiveType({ name, type, description }) {
  return (
    <>
      <h1>{name}</h1>
      <div>
        {type} - {description}
      </div>
    </>
  );
}

export function StructType({ name, fields }) {
  return (
    <>
      <h1>{name}</h1>
      {fields.map(field => {
        return (
          <div>
            {field.name} - {field.type.name} - {field.description}
          </div>
        );
      })}
    </>
  );
}

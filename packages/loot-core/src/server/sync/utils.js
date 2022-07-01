export function getTablesFromMessages(messages) {
    return messages.reduce((acc, message) => {
      let dataset =
        message.dataset === 'schedules_next_date' ? 'schedules' : message.dataset;
  
      if (!acc.includes(dataset)) {
        acc.push(dataset);
      }
      return acc;
    }, []);
}

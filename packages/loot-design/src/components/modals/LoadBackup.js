import React from 'react';

import { colors } from '../../style';
import { View, Text, Block, Modal, Button } from '../common';
import { Row, Cell } from '../table';

class BackupTable extends React.Component {
  state = { hoveredBackup: null };

  onHover = id => {
    this.setState({ hoveredBackup: id });
  };

  render() {
    const { backups, onSelect } = this.props;
    const { hoveredBackup } = this.state;

    return (
      <View
        style={{ flex: 1, maxHeight: 200, overflow: 'auto' }}
        onMouseLeave={() => this.onHover(null)}
      >
        {backups.map((backup, idx) => (
          <Row
            key={backup.id}
            collapsed={idx !== 0}
            focused={hoveredBackup === backup.id}
            onMouseEnter={() => this.onHover(backup.id)}
            onClick={() => onSelect(backup.id)}
            style={{ cursor: 'pointer' }}
          >
            <Cell
              width="flex"
              value={backup.date ? backup.date : 'Revert to Latest'}
              valueStyle={{ paddingLeft: 20 }}
            />
          </Row>
        ))}
      </View>
    );
  }
}

function LoadBackup({
  budgetId,
  backups,
  backupDisabled,
  actions,
  modalProps
}) {
  const latestBackup = backups.find(backup => backup.isLatest);
  const previousBackups = backups.filter(backup => !backup.isLatest);

  return (
    <Modal title="Load Backup" padding={0} {...modalProps} style={{ flex: 0 }}>
      {() => (
        <View style={{ marginBottom: 30 }}>
          <View
            style={{
              margin: 20,
              marginTop: 0,
              marginBottom: 15,
              lineHeight: 1.5
            }}
          >
            {latestBackup ? (
              <Block>
                <Block style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 600 }}>
                    You are currently working from a backup.
                  </Text>{' '}
                  You can load a different backup or revert to the original
                  version below.
                </Block>
                <Button
                  primary
                  onClick={() => actions.loadBackup(budgetId, latestBackup.id)}
                >
                  Revert to original version
                </Button>
              </Block>
            ) : (
              <View style={{ alignItems: 'flex-start' }}>
                <Block style={{ marginBottom: 10 }}>
                  Select a backup to load. After loading a backup, you will have
                  a chance to revert to the current version in this screen.{' '}
                  <Text style={{ fontWeight: 600 }}>
                    If you use a backup, you will have to setup all your devices
                    to sync from the new budget.
                  </Text>
                </Block>
                <Button
                  primary
                  disabled={backupDisabled}
                  onClick={() => actions.makeBackup()}
                >
                  Backup Now
                </Button>
              </View>
            )}
          </View>
          {previousBackups.length === 0 ? (
            <Block style={{ color: colors.n6, marginLeft: 20 }}>
              No backups available
            </Block>
          ) : (
            <BackupTable
              backups={previousBackups}
              onSelect={id => actions.loadBackup(budgetId, id)}
            />
          )}
        </View>
      )}
    </Modal>
  );
}

export default LoadBackup;

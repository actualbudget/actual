import React from 'react';

import Component from '@reactions/component';

import { Section, TestModal } from '../guide/components';

import { Input, Modal, View, Button, Stack } from './common';

export default () => {
  return (
    <Section style={{ width: 200 }}>
      Input
      <Input defaultValue="value" onEnter={e => alert(e.target.value)} />
      Buttons
      <Stack
        align="flex-start"
        style={{ backgroundColor: 'white', padding: 15 }}
      >
        <Button>Hello</Button>
        <Button primary>Hello</Button>
        <Button bare>Hello</Button>
      </Stack>
      Modal
      <Component initialState={{ modalCount: 1 }}>
        {({ state, setState }) => {
          return (
            <TestModal width={600} height={500}>
              {node => {
                let modals = [];

                for (let i = 0; i < state.modalCount; i++) {
                  let modalProps = {
                    onClose: () =>
                      setState({ modalCount: state.modalCount - 1 }),
                    isCurrent: i === state.modalCount - 1,
                    stackIndex: i,
                    parent: node
                  };

                  modals.push(
                    <Modal {...modalProps}>
                      <View style={{ height: 300 }}>
                        Pushin' and poppin'
                        <Button
                          primary
                          onClick={() =>
                            setState({ modalCount: state.modalCount + 1 })
                          }
                          style={{ marginTop: 10, alignSelf: 'flex-start' }}
                        >
                          Push modal
                        </Button>
                        <Button
                          primary
                          onClick={() =>
                            setState({ modalCount: state.modalCount - 1 })
                          }
                          style={{ marginTop: 10, alignSelf: 'flex-start' }}
                        >
                          Pop modal
                        </Button>
                      </View>
                    </Modal>
                  );
                }

                return modals;
              }}
            </TestModal>
          );
        }}
      </Component>
    </Section>
  );
};

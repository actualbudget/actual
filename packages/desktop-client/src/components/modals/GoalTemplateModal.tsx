import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { theme } from '../../style';
import { Link } from '../common/Link';

type GroupHeadingProps = {
  group: string;
};

function GroupHeading({ group }: GroupHeadingProps) {
  return (
    <Text
      style={{
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {group}:
    </Text>
  );
}

export function GoalTemplateModal() {
  return (
    <Modal name="goal-templates">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Goal Templates"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'row',
              fontSize: 13,
            }}>
            <Text style={{textAlign: 'left'}}>
              <h3>Weekly:</h3>
              <strong>#template $10 repeat every week starting 2025-01-03</strong>  -  Budget $10 a week <br />{'\n'}
              <strong>#template $10 repeat every week starting 2025-01-03 up to 80</strong>  -  Budget $10 a week, up to a maximum of $80
              <h3>Monthly:</h3>
              <strong>#template $50</strong>  -  Budget $50 each month <br />{'\n'}
              <strong>#template up to $150</strong>  -	Budget up to $150 each month, and remove extra funds over $150 <br /> {'\n'}
              <strong>#template up to $150 hold</strong>  -  Budget up to $150 each month, but retain any funds over $150 <br />{'\n'}
              <h3>Longer Term:</h3>
              <strong>#template $500 by 2025-03 repeat every 6 months</strong>  -  Break down large, less-frequent expenses into manageable monthly expenses <br />{'\n'}
              <strong>#template $500 by 2025-03 repeat every year</strong>  -  Break down large, less-frequent expenses into manageable monthly expenses <br />{'\n'}
              <strong>#template $500 by 2025-03 repeat every 2 years</strong>  -  Break down large, less-frequent expenses into manageable monthly expenses 
              <h3>Schedules:</h3>
              <strong>#template schedule SCHEDULE_NAME</strong>  -  Fund upcoming scheduled transactions over time <br />{'\n'}
              <strong>#template schedule full SCHEDULE_NAME</strong>  -  Fund upcoming scheduled transaction only on needed month
              <h3>Goals:</h3>
              <strong>#goal 1000</strong>  -  Set a long term goal instead of a monthly goal <br /> {'\n'}
              <div
                    style={{
                      textAlign: 'right',
                      fontSize: '0.7em',
                      color: theme.pageTextLight,
                      marginTop: 3,
                    }}
                  >
                    <Text>
                      See{' '}
                      <Link
                        variant="external"
                        linkColor="muted"
                        to="https://actualbudget.org/docs/experimental/goal-templates"
                      >
                        Goal Templates
                      </Link>{' '}
                      for more information.
                    </Text>
                    </div>
            </Text>
          </View>
        </>
      )}
    </Modal>
  );
}

export function RepairSyncNotification() {}

// TODO: sync button shouldn't show error status if it's a local file
// and needs uploading.. should just be grayed out
//
// TODO: improve styling of these modals

// export function NeedsUploadNotification({ actions }) {
//   let [loading, setLoading] = useState(false);

//   return (
//     <Stack align="center" direction="row">
//       <Text>
//         This file is not a cloud file. You need to register it to take advantage
//         of syncing which allows you to use it across devices and never worry
//         about losing your data.
//       </Text>
//       <ButtonWithLoading
//         bare
//         loading={loading}
//         onClick={async () => {
//           setLoading(true);
//           await actions.uploadBudget();
//           actions.removeNotification('file-needs-upload');
//           setLoading(false);

//           actions.sync();
//           actions.loadPrefs();
//         }}
//         style={{
//           backgroundColor: 'rgba(100, 100, 100, .12)',
//           color: colors.n1,
//           fontSize: 14,
//           flexShrink: 0,
//           '&:hover, &:active': { backgroundColor: 'rgba(100, 100, 100, .25)' }
//         }}
//       >
//         Register
//       </ButtonWithLoading>
//     </Stack>
//   );
// }

// export function SyncResetNotification({ cloudFileId, actions }) {
//   return (
//     <Stack align="center" direction="row">
//       <Text>
//       </Text>
//       <Button
//         bare
//         onClick={async () => {
//           actions.removeNotification('out-of-date-key');
//         }}
//         style={{
//           backgroundColor: colors.r10,
//           flexShrink: 0,
//           '&:hover': { backgroundColor: colors.r10 },
//           '&:active': { backgroundColor: colors.r8 }
//         }}
//       >
//         Revert
//       </Button>
//     </Stack>
//   );
// }

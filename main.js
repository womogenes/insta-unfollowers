const fs = require('fs');
const { IgApiClient } = require('instagram-private-api');

const targetUsername = '<target_username>'; // User to analyze
const loginUsername = '<login_username>'; // Your Instagram username
const password = '<login_password>'; // Your Instagram password

// Helper function for adding a delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getUserList = (ig, targetUsername, methodName) => {
  return new Promise(async (resolve, reject) => {
    const id = await ig.user.getIdByUsername(targetUsername);
    const feed =
      methodName === 'followers'
        ? ig.feed.accountFollowers(id)
        : ig.feed.accountFollowing(id);
    let userList = [];

    const fetchData = async () => {
      let items = await feed.items();
      console.log(`Fetched ${items.length} more ${methodName}...`);
      userList = [...userList, ...items];
      const isMore = await feed.isMoreAvailable();
      if (isMore) {
        await sleep(500);
        fetchData();
      } else {
        resolve(userList);
      }
    };

    await fetchData();
  });
};

const main = async () => {
  console.log('Logging in...');
  const ig = new IgApiClient();
  ig.state.generateDevice(loginUsername);
  await ig.account.login(loginUsername, password);
  console.log('Logged in successfully!');

  const followers = await getUserList(ig, targetUsername, 'followers');
  const following = await getUserList(ig, targetUsername, 'following');
  console.log(
    `${targetUsername} has ${followers.length} followers, ${following.length} following.`
  );

  const unfollowers = following.filter((x) => {
    return !followers.find((user) => user.pk_id === x.pk_id);
  });
  console.log(
    `${targetUsername} follows ${unfollowers.length} users who do not follow them back:`
  );
  const maxUsernameLen = Math.max(...unfollowers.map((x) => x.username.length));
  let unfollowerResults = '';
  unfollowers.forEach((user, i) => {
    let line = `${i.toString().padStart(3)}) @${user.username.padEnd(
      maxUsernameLen + 5
    )} (${user.full_name})`;
    unfollowerResults += line + '\n';
    console.log(line);
  });

  fs.writeFile(
    `./${targetUsername}-unfollowers.txt`,
    unfollowerResults,
    'utf8',
    () => console.log('Saved unfollowers as plain text.')
  );
  fs.writeFile(
    `./${targetUsername}-unfollowers.json`,
    JSON.stringify(unfollowers),
    'utf8',
    () => console.log('Saved unfollowers as json.')
  );
  fs.writeFile(
    `./${targetUsername}-followers.json`,
    JSON.stringify(followers),
    'utf8',
    () => console.log('Saved followers.')
  );
  fs.writeFile(
    `./${targetUsername}-following.json`,
    JSON.stringify(following),
    'utf8',
    () => console.log('Saved following.')
  );
};

main();

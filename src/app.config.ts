export default defineAppConfig({
  pages: [
    'pages/loading/index',
    'pages/transport/index',
    'pages/arrival/index',
    'pages/records/index',
    'pages/stats/index',
    'pages/batch-detail/index',
    'pages/trip-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0EA5E9',
    navigationBarTitleText: '冷链装车助手',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#0EA5E9',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/loading/index',
        text: '装车'
      },
      {
        pagePath: 'pages/transport/index',
        text: '运输'
      },
      {
        pagePath: 'pages/arrival/index',
        text: '到站'
      },
      {
        pagePath: 'pages/records/index',
        text: '记录'
      },
      {
        pagePath: 'pages/stats/index',
        text: '统计'
      }
    ]
  }
})

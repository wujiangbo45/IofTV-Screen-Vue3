//mapData数据结构
import ln from '../../assets/img/image2.png';
import './echarts-gl-import'; // 引入echarts-gl支持geo3D
import * as echarts from "echarts";
export interface MapdataType {
  name: string;
  value: [number, number, number]; //x,y,value  第一个x 第二个y  第三个value
}
export const optionHandle = (regionCode: string, list: object[], mapData: MapdataType[]) => {
  console.log(regionCode, list, mapData);
  let top = 45;
  let zoom = ["china"].includes(regionCode) ? 1.05 : 1;
  
  return {
    backgroundColor: {
          image: ln, // 请将图片放到 src/assets/img/map-bg.png
          
          // repeat: 'no-repeat',
    },
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
    },
    geo3D: {
          light: {
            main: {
              color: '#0a7171', // 主光源发光色
              intensity: 0.1,
              shadow: true,
            },
            ambient: {
              color: '#00f7f6', // 环境光发光色
              intensity: 1,
            }
          },
          map: regionCode,
          type: 'map3D',
          roam: false,
          shading: 'realistic',
          realisticMaterial: {
            detailTexture: ln, // 只用图片贴图
            
          },
          regionHeight: 5,
          itemStyle: {
            borderColor: '#005a66', 
            borderWidth: 0.8,
            opacity: 1,
            shadowColor: '#005a66', // 发光也调暗
            shadowBlur: 1,
            shadowOffsetY: 0,
            shadowOffsetX: 0,
          },
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              color: 'rgba(255,255,255,0.01)', // 悬浮时亮色叠加
              borderColor: '#00eaff', // 高亮边框
              borderWidth: 0.8,
              shadowColor: '#00eaff',
              shadowBlur: 15,
            }
          },
          viewControl: {
            alpha: 60, // 俯仰角，越小越“平”
            beta: 0,
            distance: 100,
            zoom: zoom,

            panMouseButton: 'left',
            rotateMouseButton: 'right',
          },
          show:false,
        },
        series: [
              {
            
                type: "map3D",
                map: regionCode,
                data: list,
                show:false,
                shading: 'realistic',
                realisticMaterial: {
                  texture: ln, // 主贴图
                  detailTexture: ln, // 可选，增强细节
                },
                viewControl: {
                  alpha: 45,           // 增大俯仰角，地图看起来更立体
                  beta: 0,
                  distance: 100,       // 拉远一些，整体更清晰
                  zoom: zoom,
                  panMouseButton: 'left',
                  rotateMouseButton: 'right',
                  minAlpha: 30,
                  maxAlpha: 90,
                  minDistance: 100,
                  maxDistance: 100,
                  center: [0, -10, 0], // y 轴偏移，正值往上，负值往下
                },
                emphasis: {
                label: {
                  show: true, // 鼠标悬浮显示 label
                  formatter: (p: any) => `${p.name}\n${p.value ?? ""}`,
                  textStyle: {
                    color: '#00f7ff',
                    fontSize: 12,
                    backgroundColor: 'rgba(0,40,70,0.6)',
                    borderRadius: 4,
                    padding: [4, 6],
                  }
                },
                itemStyle: {
                  color: 'rgba(255,255,255,0.01)', // 高亮叠加色，可调亮度
                  borderColor: '#00eaff18',
                  borderWidth: 1,
                  shadowColor: '#00eaff',
                  shadowBlur: 15,
                }
              },
              label: { show: false }, // 默认不显示
                
              }

          
        ],
    //动画效果
    // animationDuration: 1000,
    // animationEasing: 'linear',
    // animationDurationUpdate: 1000
  };
};

export const regionCodes: any = {
  中国: {
    adcode: "100000",
    level: "country",
    name: "中华人民共和国",
  },
  新疆维吾尔自治区: {
    adcode: "650000",
    level: "province",
    name: "新疆维吾尔自治区",
  },
  湖北省: {
    adcode: "420000",
    level: "province",
    name: "湖北省",
  },
  辽宁省: {
    adcode: "210000",
    level: "province",
    name: "辽宁省",
  },
  广东省: {
    adcode: "440000",
    level: "province",
    name: "广东省",
  },
  内蒙古自治区: {
    adcode: "150000",
    level: "province",
    name: "内蒙古自治区",
  },
  黑龙江省: {
    adcode: "230000",
    level: "province",
    name: "黑龙江省",
  },
  河南省: {
    adcode: "410000",
    level: "province",
    name: "河南省",
  },
  山东省: {
    adcode: "370000",
    level: "province",
    name: "山东省",
  },
  陕西省: {
    adcode: "610000",
    level: "province",
    name: "陕西省",
  },
  贵州省: {
    adcode: "520000",
    level: "province",
    name: "贵州省",
  },
  上海市: {
    adcode: "310000",
    level: "province",
    name: "上海市",
  },
  重庆市: {
    adcode: "500000",
    level: "province",
    name: "重庆市",
  },
  西藏自治区: {
    adcode: "540000",
    level: "province",
    name: "西藏自治区",
  },
  安徽省: {
    adcode: "340000",
    level: "province",
    name: "安徽省",
  },
  福建省: {
    adcode: "350000",
    level: "province",
    name: "福建省",
  },
  湖南省: {
    adcode: "430000",
    level: "province",
    name: "湖南省",
  },
  海南省: {
    adcode: "460000",
    level: "province",
    name: "海南省",
  },
  江苏省: {
    adcode: "320000",
    level: "province",
    name: "江苏省",
  },
  青海省: {
    adcode: "630000",
    level: "province",
    name: "青海省",
  },
  广西壮族自治区: {
    adcode: "450000",
    level: "province",
    name: "广西壮族自治区",
  },
  宁夏回族自治区: {
    adcode: "640000",
    level: "province",
    name: "宁夏回族自治区",
  },
  浙江省: {
    adcode: "330000",
    level: "province",
    name: "浙江省",
  },
  河北省: {
    adcode: "130000",
    level: "province",
    name: "河北省",
  },
  香港特别行政区: {
    adcode: "810000",
    level: "province",
    name: "香港特别行政区",
  },
  台湾省: {
    adcode: "710000",
    level: "province",
    name: "台湾省",
  },
  澳门特别行政区: {
    adcode: "820000",
    level: "province",
    name: "澳门特别行政区",
  },
  甘肃省: {
    adcode: "620000",
    level: "province",
    name: "甘肃省",
  },
  四川省: {
    adcode: "510000",
    level: "province",
    name: "四川省",
  },
  天津市: {
    adcode: "120000",
    level: "province",
    name: "天津市",
  },
  江西省: {
    adcode: "360000",
    level: "province",
    name: "江西省",
  },
  云南省: {
    adcode: "530000",
    level: "province",
    name: "云南省",
  },
  山西省: {
    adcode: "140000",
    level: "province",
    name: "山西省",
  },
  北京市: {
    adcode: "110000",
    level: "province",
    name: "北京市",
  },
  吉林省: {
    adcode: "220000",
    level: "province",
    name: "吉林省",
  },
};

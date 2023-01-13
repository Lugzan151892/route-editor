import { useEffect, useRef, useState } from 'react';
import styles from './MainContainer.module.css';

function MainContainer() {
    const [inputValue, setInputValue] = useState(''); 
    const map = useRef(null);
    const [placeList, setPlaceList] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentDraggingItem, setCurrentDraggingItem] = useState(null);
    const myMap = useRef(null);

    const getMapObj = (zoom, center) => {
        const newMap = new window.ymaps.Map('map', {
            center: center? center : [55.751574, 37.573856],
            zoom: zoom ? zoom : 7,
            controls: ['zoomControl']
        }, {
            searchControlProvider: 'yandex#search'
        })    
        return newMap; 
    }

    const handleLoad = () => {
        window.ymaps.ready(() => {
            map.value = getMapObj();
        });
    }
    
    function handleChange(e) {
        setInputValue(e.target.value);
    }

    const fillMap = (mapObjects, zoom, center) => {
        if(!mapObjects) mapObjects = placeList;
        if(map.value) {
            map.value.destroy();
        }
        window.ymaps.ready(() => {
            const newMap = getMapObj(zoom, center);
            map.value = newMap;
            if(!mapObjects.length) return;
            mapObjects.forEach((el) => {
                let myGeoObject = new window.ymaps.GeoObject({
                    geometry: {
                        type: "Point",
                        coordinates: el.coords
                    },
                    properties: {
                        hintContent: el.name,
                        balloonContent: el.name
                    }},
                    {                    
                        preset: 'islands#blackStretchyIcon',                    
                        draggable: true
                    }
                )
                myGeoObject.events.add("dragend", (e) => {
                    const currentCoords = e.originalEvent.target.geometry._coordinates;
                    const newList = mapObjects.map(item => {
                        if (item.id === el.id) {
                            return {...item, coords: currentCoords};
                        }
                        return item;
                    });
                    fillMap(newList, map.value.getZoom(), map.value.getCenter());
                    setPlaceList(newList);                    
                })
                newMap.geoObjects.add(myGeoObject)
            })
            if(mapObjects.length > 1) {
                let coordsList = [];
                mapObjects.forEach(el => {coordsList.push(el.coords)});
                let myPolyline = new window.ymaps.Polyline(coordsList, {
                    balloonContent: "Ломаная линия"
                }, {                    
                    balloonCloseButton: false,
                    strokeColor: "#000000",                    
                    strokeWidth: 4,                    
                    strokeOpacity: 0.5
                });
                newMap.geoObjects.add(myPolyline);
            }              
        });
    };

    const formSubmit = (e) => {
        e.preventDefault();
        window.ymaps.geocode(inputValue, {
            results: 1
        })
        .then(res => {
            let firstGeoObject = res.geoObjects.get(0);
            if(!firstGeoObject) {
                openModal();
                return;
            }
            let coords = firstGeoObject.geometry.getCoordinates();
            const newList = [...placeList, {
                name: inputValue,
                coords: coords,
                id: Date.now(),
                order: placeList.length + 1
            }];
            setPlaceList(newList);
            fillMap(newList, map.value.getZoom(), map.value.getCenter());                  
        })
        .catch(err => console.log(err))      
        setInputValue('');
    };

    const openModal = () => {
        setModalOpen(true);
        setTimeout(() => {
            setModalOpen(false)
        }, 2000);
    }

    const handleDelete = (item) => {
        const newList = placeList.filter(el => el.id !== item.id);
        fillMap(newList, map.value.getZoom(), map.value.getCenter());
        setPlaceList(newList);
    }

    function handleDragStart(e, item) {
        setCurrentDraggingItem(item);
    }    
    function handleDragDrop (e, item) {
        e.preventDefault();
        const sortedPlaceList = placeList.map(el => {
            if(el.id === item.id) {
                return {...el, order: currentDraggingItem.order}
            }
            if(el.id === currentDraggingItem.id) {
                return {...el, order: item.order}
            }
            return el;
        }).sort((a, b) => a.order > b.order ? 1 : -1);
        fillMap(sortedPlaceList, map.value.getZoom(), map.value.getCenter());
        setPlaceList(sortedPlaceList);
    }

    useEffect(() => {
        window.addEventListener('load', handleLoad);
        return () => {window.removeEventListener('load', handleLoad)}
    });

    return ( 
        <div className={styles.mainContainer}>
            <h1 className={styles.title}>Постройте маршрут</h1>
            <div className={styles.map_container}>
                <div>
                    <h1 className={styles.map_container_title}>Ваш маршрут:</h1>
                    <form onSubmit={formSubmit}>
                        <input autoFocus placeholder='Введите точку маршрута' value={inputValue} onChange={handleChange} className={styles.input} type="text" />
                    </form>                
                    <ul className={styles.places}>
                        {placeList.map((el) => (
                            <li 
                            draggable 
                            onDragStart={(e)=> handleDragStart(e, el)}
                            onDragOver={(e)=>  e.preventDefault()}
                            onDrop={(e)=> handleDragDrop(e, el)}
                            className={styles.places_item} 
                            key={el.id}>
                                <p className={styles.places_title}>{`${el.name}`}</p>
                                <button className={styles.places_button} onClick={() => handleDelete(el)}></button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div ref={myMap} id='map' className={styles.map}>
                </div>
                {
                    modalOpen &&
                    <div className={styles.modal}>
                        Точка не найдена. Проверьте правильность введенных данных
                    </div>
                }
            </div>
        </div> 
    );
}

export default MainContainer;

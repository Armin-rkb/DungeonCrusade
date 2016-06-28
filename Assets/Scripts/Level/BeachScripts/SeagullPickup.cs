using UnityEngine;
using System.Collections;

public class SeagullPickup : MonoBehaviour {

    [SerializeField]
    private Pickup pickup;

    [SerializeField]
    private GameObject[] _droppedObjects;

    [SerializeField]
    private FXManager fxManager;

    void Start()
    {
        Invoke("InstantiatePickUp", Random.Range(1,6));
    }

    void InstantiatePickUp()
    {
        SoundManager.PlayAudioClip(20);
        GameObject droppedObj = Instantiate(_droppedObjects[Random.Range(0, _droppedObjects.Length)], transform.position, transform.rotation) as GameObject;
        fxManager.PlayFX(0, droppedObj.transform.position);
    }
}

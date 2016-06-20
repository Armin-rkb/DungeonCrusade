using UnityEngine;
using System.Collections;

public class DragonEntrance : MonoBehaviour {

    [SerializeField]
    private WakeDragonAnim _wakeDragon;

    [SerializeField]
    private GameObject _dragon;



    void Awake()
    {
        _wakeDragon.OnDragonEnter += TurnOnDragon;
    }

    void Start()
    {
        _dragon.SetActive(false);
    }

    void TurnOnDragon()
    {
        _dragon.SetActive(true);
    }
}

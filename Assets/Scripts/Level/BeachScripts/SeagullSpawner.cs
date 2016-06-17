using UnityEngine;
using System.Collections;

public class SeagullSpawner : MonoBehaviour {

    [SerializeField]
    private GameObject _seagullObject;

    void Start()
    {
        InvokeRepeating("SpawnSeagull", Random.Range(3,10),Random.Range(30,40));
    }

    void SpawnSeagull()
    {
        Instantiate(_seagullObject, transform.position, Quaternion.identity);
    }
}

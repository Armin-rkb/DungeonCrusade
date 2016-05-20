using UnityEngine;
using System.Collections;

public class PickupSpawner : MonoBehaviour
{
    [SerializeField] private Pickup pickup;
    private Pickup spawnedPickup;
    private int spawnChance;
    [SerializeField] private FXManager fxManager;
    private bool isSpawned;

    void Start()
    {
        InvokeRepeating ("SpawnCheck", 1, 1);
    }

    void Update()
    {
        //Check if we can spawn
        if (!isSpawned)
            GetPickup();
    }

    void SpawnCheck()
    {
        //Check if the spawned pickup is removed
        if (spawnedPickup == null)
        {
            isSpawned = false;
        }
    }

    void GetPickup()
    {
        spawnChance++;

        if (spawnChance % 100 == 0)
        {
            int i = Random.Range(0, 10);

            if (i == 0)
            {
                Pickup currPickup = Instantiate(pickup, transform.position, transform.rotation) as Pickup;
                fxManager.PlayFX(0, currPickup.transform.position);
                spawnedPickup = currPickup;
                isSpawned = true;
            }
        }
    }
}

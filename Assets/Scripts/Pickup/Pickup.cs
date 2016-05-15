using UnityEngine;
using System.Collections;

public class Pickup : MonoBehaviour
{
    void GiveWeapon(GameObject player)
    {
        //Get a random number to put in our player weaponlist
        int randomWeapon = Random.Range(1, 7);
        PlayerWeapon playerWeapon = player.GetComponent<PlayerWeapon>();

        //When we get the same number in the list we will choose the default weapon: 0
        if (playerWeapon.currNumber == randomWeapon)
            randomWeapon = 0;
        
        playerWeapon.SetNewWeapon(randomWeapon);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.tag == "Player")
            {
                GiveWeapon(coll.gameObject);
                Destroy(this.gameObject);
            }
        }
    }
}

using UnityEngine;
using System.Collections;

public class particalcollision : MonoBehaviour
{
    void OnParticleCollision(GameObject other)
    {
        if (other != null)
        {
            if (other.CompareTag(GameTags.player))
                Hit(other);
        }
    }

    void Hit(GameObject player)
    {
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (transform.position - rbPlayer.transform.position).normalized;
        playerMovement.ApplyKnockback(currPosition * 5);
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(1, true);
    }
}
